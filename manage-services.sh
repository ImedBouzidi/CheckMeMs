#!/usr/bin/env bash
# CheckMeMS service manager — interactive menu plus a scriptable CLI.
#
#   ./manage-services.sh                      interactive menu
#   ./manage-services.sh status               one-shot table
#   ./manage-services.sh start all            or: start games-service learning-service
#   ./manage-services.sh stop eureka-server
#   ./manage-services.sh restart api-gateway
#   ./manage-services.sh logs games-service -f
#   ./manage-services.sh logs games-service ERROR
#   ./manage-services.sh infra
#   ./manage-services.sh kill-port 8081
#
# Tunables: JAVA_HOME, START_TIMEOUT, STOP_GRACE, NO_COLOR

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_DIR="$ROOT_DIR/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# All Spring services target Java 21 (see <java.version> in each pom). The system
# /usr/lib/jvm/java-21-openjdk-amd64 is a JRE without javac, so resolve a real JDK.
REQUIRED_JAVA_MAJOR="${REQUIRED_JAVA_MAJOR:-21}"

javac_major() {
  local ver major
  ver="$(  "$1/bin/javac" -version 2>&1 | head -1 | grep -oE '[0-9]+(\.[0-9]+)*' | head -1 )"
  [[ -n "$ver" ]] || return 1
  major="${ver%%.*}"
  [[ "$major" == "1" ]] && { ver="${ver#1.}"; major="${ver%%.*}"; }
  echo "$major"
}

find_jdk() {
  local d
  for d in "${JAVA_HOME:-}" /usr/lib/jvm/java-21-openjdk-amd64 "$HOME"/.jdks/*21* \
           "$HOME"/.sdkman/candidates/java/*21* /usr/lib/jvm/*21* /usr/lib/jvm/*; do
    [[ -n "$d" && -x "$d/bin/javac" ]] || continue
    [[ "$(javac_major "$d")" == "$REQUIRED_JAVA_MAJOR" ]] || continue
    echo "$d"
    return 0
  done
  return 1
}

java_label() { [[ -n "$RESOLVED_JDK" ]] && echo "Java $(javac_major "$RESOLVED_JDK"), $RESOLVED_JDK" || echo "no JDK $REQUIRED_JAVA_MAJOR found"; }

if RESOLVED_JDK="$(find_jdk)"; then
  export JAVA_HOME="$RESOLVED_JDK"
  export PATH="$JAVA_HOME/bin:$PATH"
else
  RESOLVED_JDK=""
fi

START_TIMEOUT="${START_TIMEOUT:-180}"   # seconds to wait for a service port
STOP_GRACE="${STOP_GRACE:-8}"          # seconds before SIGKILL

if [[ -t 1 && -z "$NO_COLOR" && "${TERM:-dumb}" != "dumb" ]]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
  BLUE=$'\033[0;34m'; CYAN=$'\033[0;36m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; DIM=''; BOLD=''; NC=''
fi

# Ports that cannot be read from a config file (the gateway sits on 8081 because Keycloak owns 8080).
declare -A KNOWN_PORTS=(
  [eureka-server]=8761
  [api-gateway]=8081
  [user-profile-service]=8084
  [games-service]=8094
  [move-analysis-service]=8082
  [learning-service]=8091
  [chess-web]=4200
)

# Expected to be running already: checked here, started elsewhere.
INFRA=("PostgreSQL|5432" "Redis|6379" "RabbitMQ|5672" "Keycloak|8080")

SVC_NAMES=(); SVC_PORTS=(); SVC_KINDS=()

# ---------------------------------------------------------------- discovery

read_config_port() {
  local name="$1" f val
  for f in "$ROOT_DIR/$name/src/main/resources/application.yml" \
           "$ROOT_DIR/$name/src/main/resources/application-local.yml"; do
    [[ -f "$f" ]] || continue
    val="$(awk '/^[[:space:]]*server:/{s=1;next}
                 s&&/[[:space:]]port:/{gsub(/[^0-9]/,"",$2); if($2!=""){print $2; exit}}
                 s&&/^[^[:space:]#]/{s=0}' "$f")"
    [[ -n "$val" ]] && { echo "$val"; return; }
  done
  echo ""
}

kind_of_dir() {
  local d="$1"
  [[ -f "$d/pom.xml" || -f "$d/build.gradle" || -f "$d/build.gradle.kts" ]] && { echo spring; return; }
  [[ -f "$d/package.json" ]] && grep -q '"ng ' "$d/package.json" && { echo npm; return; }
  echo ""
}

env_server_port() {
  local f="$1/.env"
  [[ -f "$f" ]] || return 0
  awk -F= '/^[[:space:]]*(export[[:space:]]+)?SERVER_PORT[[:space:]]*=/{gsub(/[ "'"'"']/,"",$2); print $2; exit}' "$f"
}

discover_services() {
  SVC_NAMES=(); SVC_PORTS=(); SVC_KINDS=()
  local candidates=() d name k port
  for d in "$ROOT_DIR"/*/; do
    name="$(basename "$d")"
    [[ "$name" == "eureka-server" || "$name" == "api-gateway" ]] && continue
    k="$(kind_of_dir "$d")"
    [[ -n "$k" ]] && candidates+=("$name")
  done
  mapfile -t candidates < <(printf '%s\n' "${candidates[@]}" | sort)

  local order=("eureka-server" "api-gateway" ${candidates:+"${candidates[@]}"})
  for name in "${order[@]}"; do
    [[ -d "$ROOT_DIR/$name" ]] || continue
    k="$(kind_of_dir "$ROOT_DIR/$name")"
    # .env wins: it is what Spring binds at runtime, so the manager must watch that port.
    port="$(env_server_port "$ROOT_DIR/$name")"
    [[ -z "$port" ]] && port="${KNOWN_PORTS[$name]:-}"
    [[ -z "$port" && "$k" == spring ]] && port="$(read_config_port "$name")"
    SVC_NAMES+=("$name"); SVC_PORTS+=("$port"); SVC_KINDS+=("$k")
  done
}

svc_index() {
  local want="$1" i
  for i in "${!SVC_NAMES[@]}"; do [[ "${SVC_NAMES[$i]}" == "$want" ]] && { echo "$i"; return; }; done
  return 1
}
is_known_svc() { svc_index "$1" >/dev/null 2>&1; }
port_of()      { local i; i="$(svc_index "$1")" && echo "${SVC_PORTS[$i]}"; }
kind_of()      { local i; i="$(svc_index "$1")" && echo "${SVC_KINDS[$i]}"; }
svc_for_port() { local want="$1" i
                 for i in "${!SVC_PORTS[@]}"; do [[ "${SVC_PORTS[$i]}" == "$want" ]] && { echo "${SVC_NAMES[$i]}"; return; }; done
                 echo ""; }

# ---------------------------------------------------------------- primitives

get_pid() {
  local pid_file="$PID_DIR/$1.pid"
  [[ -f "$pid_file" ]] || return 1
  local pid; pid="$(head -1 "$pid_file" 2>/dev/null | tr -dc '0-9')"
  [[ -n "$pid" ]] || { rm -f "$pid_file"; return 1; }
  if ps -p "$pid" >/dev/null 2>&1; then echo "$pid"; else rm -f "$pid_file"; return 1; fi
}

# `ss` sees sockets owned by other users (postgres, containers); `lsof` does not.
listening_ports() {
  if command -v ss >/dev/null 2>&1; then
    ss -ltnH 2>/dev/null | awk '{split($4,a,":"); if(a[length(a)]!="") print a[length(a)]}' | sort -n -u
  else
    lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{split($9,a,":"); print a[length(a)]}' | sort -n -u
  fi
}

# port|pid|process — pid is empty when the socket belongs to another user.
listener_lines() {
  ss -ltnpH 2>/dev/null | awk '{split($4,a,":"); port=a[length(a)]; pid=""; comm=""
                               if(match($0,/pid=[0-9]+/)) pid=substr($0,RSTART+4,RLENGTH-4)
                               if(match($0,/"[^"]+"/))     comm=substr($0,RSTART+1,RLENGTH-2)
                               if(port!="") print port"|"pid"|"comm}' | sort -t'|' -k1,1n -u | awk -F'|' '!seen[$1]++'
}

port_is_open() { [[ -n "${1:-}" ]] && listening_ports | grep -qx "$1"; }

listener_pid() {
  local port="${1:-}" pid=""
  [[ -n "$port" ]] || return 1
  pid="$(listener_lines | awk -F'|' -v p="$port" '$1==p && $2!="" {print $2; exit}')"
  [[ -n "$pid" ]] || pid="$(lsof -t -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1)"
  [[ -n "$pid" ]] && echo "$pid"
}

http_probe() {
  local code; code="$(curl -s -o /dev/null -m 2 -w '%{http_code}' "http://localhost:$1/" 2>/dev/null)"
  [[ -n "$code" && "$code" != "000" ]] && echo "$code" || echo "—"
}

proc_cmd()  { ps -o comm= -p "${1:-0}" 2>/dev/null | tr -d ' '; }
uptime_of() { local e; e="$(ps -o etime= -p "${1:-0}" 2>/dev/null | tr -d ' ')"; echo "${e:--}"; }

# running | port_taken | stopped
state_of() {
  local svc="$1" pid port
  pid="$(get_pid "$svc")" || pid=""
  port="$(port_of "$svc")"
  if [[ -n "$pid" ]]; then echo running
  elif [[ -n "$port" ]] && port_is_open "$port"; then echo port_taken
  else echo stopped; fi
}

log_file()  { echo "$LOG_DIR/$1.log"; }
count_up()  { local n=0 s; for s in "${SVC_NAMES[@]}"; do [[ "$(state_of "$s")" == running ]] && ((n++)); done; echo "$n"; }

holder_desc() {
  local port="$1" pid; pid="$(listener_pid "$port")"
  if [[ -z "$pid" ]]; then echo "a process your user cannot see"
  else echo "PID $pid ($(proc_cmd "$pid"))"; fi
}

log_hint() {
  local svc="$1" f; f="$(log_file "$svc")"
  [[ -f "$f" ]] || { echo -e "${DIM}   (no log written yet)${NC}"; return; }
  local errs; errs="$(grep -nE 'ERROR|Exception|BUILD FAILURE|Address already in use|Web server failed|Could not resolve' "$f" | tail -6)"
  if [[ -n "$errs" ]]; then
    echo -e "${DIM}   problems found in log:${NC}"
    printf '%s\n' "$errs" | cut -c1-150 | sed 's/^/   /'
  else
    echo -e "${DIM}   log tail:${NC}"
    tail -4 "$f" | cut -c1-150 | sed 's/^/   /'
  fi
}

# ---------------------------------------------------------------- actions

start_service() {
  local svc="$1" quiet="${2:-0}"
  is_known_svc "$svc" || { echo -e "${RED}[$svc] Unknown service${NC}"; return 1; }

  local pid port kind
  pid="$(get_pid "$svc")" || pid=""
  if [[ -n "$pid" ]]; then
    (( quiet )) || echo -e "${YELLOW}[$svc] Already running (PID $pid, port $(port_of "$svc"))${NC}"
    return 0
  fi
  port="$(port_of "$svc")"
  if [[ -n "$port" ]] && port_is_open "$port"; then
    echo -e "${RED}[$svc] Port $port is already held by $(holder_desc "$port")${NC}"
    echo -e "${DIM}   Free it with the 'Free a port' menu item, or restart the service to take it over.${NC}"
    return 1
  fi
  local dir="$ROOT_DIR/$svc"
  [[ -d "$dir" ]] || { echo -e "${RED}[$svc] No such directory: $dir${NC}"; return 1; }
  kind="$(kind_of "$svc")"

  if [[ "$kind" == spring && -z "$RESOLVED_JDK" ]]; then
    echo -e "${RED}[$svc] No JDK $REQUIRED_JAVA_MAJOR with a javac found.${NC}"
    echo -e "${DIM}   Install one (sudo apt install openjdk-21-jdk-headless) or point the script at it:${NC}"
    echo -e "${DIM}   JAVA_HOME=/path/to/jdk21 ./$(basename "$0") start $svc   (override the check with REQUIRED_JAVA_MAJOR)${NC}"
    return 1
  fi

  (( quiet )) || echo -e "${BLUE}[$svc] Starting ($([[ "$kind" == npm ]] && echo "npm start" || echo "spring-boot:run, profile=local, $(java_label)"))...${NC}"

  (
    cd "$dir" || exit 1
    [[ -f .env ]] && { set -a; . ./.env; set +a; }
    if [[ "$kind" == npm ]]; then
      export BROWSER=none
      setsid nohup npm start > "$(log_file "$svc")" 2>&1 &
    else
      export SPRING_PROFILES_ACTIVE=local
      local runner="mvn"
      [[ -f mvnw ]] && { chmod +x mvnw 2>/dev/null; runner="./mvnw"; }
      # setsid gives the build its own process group, so mvn and the JVM it forks die together.
      setsid nohup "$runner" spring-boot:run -Dspring-boot.run.profiles=local > "$(log_file "$svc")" 2>&1 &
    fi
    echo $! > "$PID_DIR/$svc.pid"
  )

  pid="$(get_pid "$svc")" || pid=""
  [[ -z "$pid" ]] && { echo -e "${RED}[$svc] Could not launch the process${NC}"; log_hint "$svc"; return 1; }

  (( quiet )) || printf '%s' "${DIM}   waiting for port ${port:-?}${NC}"
  WAIT_INTERRUPTED=0
  trap 'WAIT_INTERRUPTED=1' INT
  local waited=0 ok=0
  while (( waited < START_TIMEOUT )) && (( WAIT_INTERRUPTED == 0 )); do
    get_pid "$svc" >/dev/null 2>&1 || break
    if [[ -n "$port" ]] && port_is_open "$port"; then ok=1; break; fi
    (( quiet )) || printf '%s' "${DIM}.${NC}"
    sleep 3; waited=$((waited + 3))
  done
  trap 'restore_cursor; exit 130' INT
  (( quiet )) || printf '\n'

  # setsid may exit before the real process is visible; adopt the listener as owner.
  if ! get_pid "$svc" >/dev/null 2>&1 && [[ -n "$port" ]] && port_is_open "$port"; then
    pid="$(listener_pid "$port")"
    [[ -n "$pid" ]] && echo "$pid" > "$PID_DIR/$svc.pid"
  fi
  pid="$(get_pid "$svc")" || pid=""

  if (( ok )) && [[ -n "$pid" ]]; then
    (( quiet )) || echo -e "${GREEN}[$svc] UP after ${waited}s — PID $pid, port $port, HTTP $(http_probe "$port")${NC}"
    return 0
  fi
  if (( WAIT_INTERRUPTED )); then
    echo -e "${YELLOW}[$svc] Wait cancelled — still starting in the background (PID ${pid:-?}); check its logs.${NC}"
    return 0
  fi
  if [[ -z "$pid" ]]; then
    echo -e "${RED}[$svc] Process died before port ${port:-?} opened — $(log_file "$svc")${NC}"
  else
    echo -e "${YELLOW}[$svc] Alive (PID $pid) but port ${port:-?} closed after ${START_TIMEOUT}s — still building, or the port config is wrong${NC}"
  fi
  log_hint "$svc"
  return 1
}

stop_service() {
  local svc="$1" force="${2:-0}"
  is_known_svc "$svc" || { echo -e "${RED}[$svc] Unknown service${NC}"; return 1; }
  local port; port="$(port_of "$svc")"
  local pid; pid="$(get_pid "$svc")" || pid=""

  if [[ -z "$pid" ]]; then
    if [[ -n "$port" ]] && port_is_open "$port"; then
      local lp; lp="$(listener_pid "$port")"
      echo -e "${YELLOW}[$svc] No PID file, but port $port is held by $(holder_desc "$port")${NC}"
      if [[ -z "$lp" ]]; then
        echo -e "${DIM}   Not killable from this user — inspect with: sudo ss -ltnp | grep :$port${NC}"
      elif (( force )) || confirm "  Kill that listener?"; then
        kill -TERM "$lp" 2>/dev/null; sleep 2
        port_is_open "$port" && kill -KILL "$(listener_pid "$port")" 2>/dev/null
        if port_is_open "$port"; then echo -e "${RED}[$svc] Port $port still held${NC}"
        else echo -e "${GREEN}[$svc] Port $port freed${NC}"; fi
      fi
    else
      echo -e "${YELLOW}[$svc] Not running${NC}"
    fi
    return 0
  fi

  echo -e "${BLUE}[$svc] SIGTERM to process group $pid...${NC}"
  kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null

  local waited=0
  while (( waited < STOP_GRACE )) && ps -p "$pid" >/dev/null 2>&1; do sleep 1; ((waited++)); done
  if ps -p "$pid" >/dev/null 2>&1; then
    echo -e "${YELLOW}[$svc] Still alive after ${STOP_GRACE}s — SIGKILL${NC}"
    kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
  fi

  # A Maven-forked JVM can outlive the build process; sweep the port.
  local lp; lp="$(listener_pid "$port")"
  if [[ -n "$port" && -n "$lp" ]]; then
    echo -e "${YELLOW}[$svc] Port $port still held by orphan PID $lp ($(proc_cmd "$lp"))${NC}"
    if (( force )) || confirm "  Kill the orphan?"; then
      kill -TERM -"$lp" 2>/dev/null || kill -TERM "$lp" 2>/dev/null; sleep 2
      port_is_open "$port" && kill -KILL "$(listener_pid "$port")" 2>/dev/null
    fi
  fi
  rm -f "$PID_DIR/$svc.pid"
  echo -e "${GREEN}[$svc] Stopped${NC}"
}

restart_service() { stop_service "$1" 1; sleep 1; start_service "$1"; }

start_all() {
  local svc failed=()
  echo -e "${BOLD}${BLUE}Starting ${#SVC_NAMES[@]} services in order${NC}"
  for svc in "${SVC_NAMES[@]}"; do
    if ! start_service "$svc"; then
      failed+=("$svc")
      [[ "$svc" == eureka-server ]] && echo -e "${RED}Eureka is not up — the rest will fail to register.${NC}"
    fi
  done
  echo ""
  if (( ${#failed[@]} == 0 )); then echo -e "${GREEN}All services started${NC}"
  else echo -e "${YELLOW}Problems with:${NC} ${failed[*]}"; fi
}

stop_all() {
  local running=() svc
  for svc in "${SVC_NAMES[@]}"; do [[ "$(state_of "$svc")" == running ]] && running+=("$svc"); done
  if (( ${#running[@]} == 0 )); then echo -e "${YELLOW}Nothing running${NC}"; return 0; fi
  printf '%s\n' "${BOLD}Running: ${running[*]}${NC}"
  confirm "Stop all ${#running[@]} service(s)?" || { echo -e "${DIM}Cancelled${NC}"; return 0; }
  for svc in "${SVC_NAMES[@]}"; do stop_service "$svc" 1; done
  echo -e "${GREEN}All services stopped${NC}"
}

restart_all() {
  local running=() svc
  for svc in "${SVC_NAMES[@]}"; do [[ "$(state_of "$svc")" == running ]] && running+=("$svc"); done
  printf '%s\n' "${BOLD}Currently up: ${running[*]:-nothing}${NC}"
  confirm "Stop everything, then start all ${#SVC_NAMES[@]} services?" || { echo -e "${DIM}Cancelled${NC}"; return 0; }
  for svc in "${SVC_NAMES[@]}"; do stop_service "$svc" 1; done
  echo ""
  start_all
}

# ---------------------------------------------------------------- views

rule() { printf '%s\n' "${DIM}$(printf '%0.s─' {1..80})${NC}"; }

# Two services claiming one port (usually a stale SERVER_PORT in .env) can never both start.
declare -A PORT_OWNERS=()

build_port_owners() {
  local i p
  PORT_OWNERS=()
  for i in "${!SVC_PORTS[@]}"; do
    p="${SVC_PORTS[$i]}"
    [[ -n "$p" ]] || continue
    PORT_OWNERS[$p]="${PORT_OWNERS[$p]:+${PORT_OWNERS[$p]} }${SVC_NAMES[$i]}"
  done
}

shared_port_warning() {
  local p owners
  for p in "${!PORT_OWNERS[@]}"; do
    owners="${PORT_OWNERS[$p]}"
    [[ "$owners" == *" "* ]] && printf '%s\n' "${YELLOW}! port $p is claimed by more than one service: $owners — only one of them can bind it (check SERVER_PORT in each .env)${NC}"
  done
}

status_table() {
  local detail="${1:-1}" svc pid port state size
  printf '%s   %s\n' "${BOLD}${BLUE} CheckMeMS services${NC}" "${DIM}$(date '+%a %H:%M:%S') · $(count_up)/${#SVC_NAMES[@]} up · $(java_label)${NC}"
  printf '%-24s %-11s %-7s %-8s %-10s %s\n' "SERVICE" "STATE" "PORT" "PID" "UPTIME" "LOG"
  rule
  for svc in "${SVC_NAMES[@]}"; do
    pid="$(get_pid "$svc")" || pid=""
    port="$(port_of "$svc")"; state="$(state_of "$svc")"
    size="$(log_file "$svc")"; size="$([[ -f "$size" ]] && du -h "$size" | cut -f1 || echo "-")"
    case "$state" in
      running)    printf "%-24s ${GREEN}%-11s${NC} %-7s %-8s %-10s %s\n" "$svc" "UP" "${port:-—}" "${pid:-—}" "$(uptime_of "$pid")" "$size" ;;
      port_taken) printf "%-24s ${YELLOW}%-11s${NC} %-7s %-8s %-10s %s\n" "$svc" "PORT BUSY" "${port:-—}" "$(listener_pid "$port")" "-" "$size" ;;
      *)          printf "%-24s ${RED}%-11s${NC} %-7s %-8s %-10s %s\n" "$svc" "down" "${port:-—}" "-" "-" "$size" ;;
    esac
  done
  rule
  shared_port_warning
  (( detail )) || return 0
  local others
  others="$(listening_ports | awk -v m=" $(managed_ports | tr '\n' ' ') " 'index(m, " "$1" ")==0' | head -12 | tr '\n' ' ')"
  [[ -n "${others// /}" ]] && printf '%s%s%s\n' "${DIM}Other listeners: ${NC}$others" "${NC}"
  printf '%s\n' "${DIM}Keys: ↑/↓ move · Enter ok · number jumps · q back · Ctrl+C cancels a wait${NC}"
}

managed_ports() {
  local i
  for i in "${!SVC_PORTS[@]}"; do [[ -n "${SVC_PORTS[$i]}" ]] && printf '%s\n' "${SVC_PORTS[$i]}"; done
  local e; for e in "${INFRA[@]}"; do printf '%s\n' "${e##*|}"; done
}

infra_table() {
  printf '%s\n' "${BOLD}${BLUE} Infrastructure — checked here, started elsewhere${NC}"
  printf '%-14s %-8s %-8s %s\n' "NAME" "PORT" "STATE" "OWNER"
  rule
  local e name port pid
  for e in "${INFRA[@]}"; do
    name="${e%%|*}"; port="${e##*|}"
    if port_is_open "$port"; then
      pid="$(listener_pid "$port")"
      printf '%-14s %-8s ' "$name" "$port"
      printf "${GREEN}%-8s${NC} %s\n" "up" "${pid:+$pid ($(proc_cmd "$pid"))${pid:-hidden (other user)}}"
    else
      printf '%-14s %-8s ' "$name" "$port"
      printf "${RED}%-8s${NC} -\n" "down"
    fi
  done
  rule
  printf '%s\n' "${DIM}Spring services need PostgreSQL, Redis and RabbitMQ; credentials live in <service>/.env.${NC}"
  printf '%s\n' "${DIM}Resource servers validate tokens against Keycloak realm 'chess-platform' on 8080.${NC}"
  echo
  printf '%s\n' "${BOLD}${BLUE} Endpoints${NC}"
  local svc
  for svc in "${SVC_NAMES[@]}"; do
    [[ -n "$(port_of "$svc")" ]] && printf '  %-24s http://localhost:%s  %s\n' "$svc" "$(port_of "$svc")" \
      "$([[ "$(state_of "$svc")" == running ]] && printf "${GREEN}up${NC}" || printf "${RED}down${NC}")"
  done
}

# ---------------------------------------------------------------- log viewer

with_tail() {  # Ctrl+C stops the tail instead of the manager
  ( trap 'exit 0' INT; "$@" )
  restore_cursor
}

view_logs_menu() {
  local svc
  pick_service "View logs for" || return 0
  svc="$PICKED"
  local f; f="$(log_file "$svc")"
  if [[ ! -f "$f" ]]; then
    echo -e "${YELLOW}No log yet: $f${NC}"; pause; return 0
  fi
  select_item "Logs for $svc — ${f#"$ROOT_DIR"/} · $(wc -l <"$f") lines · $(du -h "$f" | cut -f1)" \
    "Follow live (Ctrl+C stops)" \
    "Page through the whole file" \
    "Last 200 lines" \
    "Errors and warnings only" \
    "Search the log" \
    "Truncate this log" || return 0
  local out
  case "$SELECTED" in
    0) echo -e "${DIM}Ctrl+C returns to the menu.${NC}"; sleep 1; with_tail tail -n 40 -F "$f" ;;
    1) less -R -X "$f" ;;
    2) less -R -X <(tail -n 200 "$f") ;;
    3) out="$(grep -nE 'ERROR|WARN|Exception|Caused by' "$f" | tail -100)"
       [[ -n "$out" ]] && printf '%s\n' "$out" | less -R -X || echo -e "${GREEN}No errors or warnings.${NC}" ;;
    4) local pat; read -rp "pattern (extended regex, case-insensitive): " pat
       [[ -z "$pat" ]] && return 0
       out="$(grep -inE -- "$pat" "$f" | tail -200)"
       [[ -n "$out" ]] && printf '%s\n' "$out" | less -R -X || echo -e "${YELLOW}No match: $pat${NC}" ;;
    5) confirm "Truncate $f?" && { : > "$f"; echo -e "${GREEN}Cleared${NC}"; } ;;
  esac
  pause
}

follow_all() {
  local files=() svc f
  for svc in "${SVC_NAMES[@]}"; do f="$(log_file "$svc")"; [[ -f "$f" ]] && files+=("$f"); done
  (( ${#files[@]} )) || { echo -e "${YELLOW}No logs yet${NC}"; pause; return 0; }
  echo -e "${DIM}Tailing ${#files[@]} log(s). Ctrl+C stops.${NC}"; sleep 1
  with_tail tail -n 5 -F "${files[@]}"
  pause
}

logs_hub() {
  select_item "Logs" "One service" "Every log at once" || return 0
  if (( SELECTED == 0 )); then view_logs_menu; else follow_all; fi
}

# ---------------------------------------------------------------- UI widgets

restore_cursor() { tput cnorm 2>/dev/null; }
confirm()          { local a; read -rp "$(printf '%s [y/N] ' "${1:-Confirm}")" a || return 1; [[ "$a" =~ ^([yY]|[yY][eE][sS])$ ]]; }
pause()            { [[ -t 0 ]] || return 0; printf '\n%s\n' "${DIM}Press any key...${NC}"; IFS= read -rsn1 </dev/tty 2>/dev/null || true; }

# select_item <title> <item>... → sets SELECTED (0-based); returns 1 when cancelled
SELECTED=0
select_item() {
  local title="$1"; shift
  local -a items=("$@")
  local n=${#items[@]} cur=0 drawn=0 key rest i
  (( n )) || return 1

  if [[ ! -t 0 ]]; then                     # scripted stdin: accept a number
    printf '%s\n' "  ${title}"
    for ((i = 0; i < n; i++)); do printf '  %d) %s\n' $((i + 1)) "${items[i]}"; done
    if read -rp "> " key 2>/dev/null && [[ "$key" =~ ^[0-9]+$ ]] && (( key >= 1 && key <= n )); then
      SELECTED=$((key - 1)); return 0
    fi
    return 1
  fi

  printf '\n%s\n' "${BOLD}${CYAN}  $title${NC}"
  while :; do
    (( drawn )) && printf '\033[%dA' $((n + 1))
    for ((i = 0; i < n; i++)); do
      if (( i == cur )); then printf '\033[2K\033[1;33m   ▸ %s\033[0m\033[K\n' "${items[i]}"
      else printf '\033[2K   %s\033[0m\033[K\n' "${items[i]}"; fi
    done
    printf '\033[2K\033[2m   ↑/↓ select · Enter ok · 1-9 jump · 0/q back\033[0m\033[K\n'
    drawn=1
    IFS= read -rsn1 key </dev/tty || return 1
    case "$key" in
      $'\x1b') IFS= read -rsn2 -t 1 rest </dev/tty 2>/dev/null
               case "$rest" in
                 '[A'|'[D') (( cur > 0 )) && (( cur-- )) ;;
                 '[B'|'[C') (( cur < n - 1 )) && (( cur++ )) ;;
               esac ;;
      k|K)  (( cur > 0 )) && (( cur-- )) ;;
      j|J)  (( cur < n - 1 )) && (( cur++ )) ;;
      q|Q|h|H|0) return 1 ;;
      $'\n'|'') break ;;
      [1-9]) (( key <= n )) && { cur=$((key - 1)); break; } ;;
    esac
  done
  SELECTED=$cur
}

pick_service() {
  local title="${1:-Service}" items=() svc state port pid lp
  for svc in "${SVC_NAMES[@]}"; do
    state="$(state_of "$svc")"; port="$(port_of "$svc")"; pid="$(get_pid "$svc")" || pid=""
    case "$state" in
      running)    items+=("$(printf '%-24s UP        port %-6s pid %s' "$svc" "${port:-—}" "${pid:-—}")") ;;
      port_taken) lp="$(listener_pid "$port")"
                  items+=("$(printf '%-24s PORT BUSY port %-6s pid %s (%s)' "$svc" "${port:-—}" "${lp:-?}" "$(proc_cmd "$lp")")") ;;
      *)          items+=("$(printf '%-24s down      port %-6s' "$svc" "${port:-—}")") ;;
    esac
  done
  select_item "$title" "${items[@]}" || return 1
  PICKED="${SVC_NAMES[$SELECTED]}"
}

service_actions_loop() {
  while :; do
    clear
    status_table 0
    echo ""
    pick_service "Service actions" || return 0
    local svc="$PICKED" state; state="$(state_of "$svc")"
    select_item "$svc — $state — port $(port_of "$svc")" \
      "Start" "Stop" "Restart" "Follow logs" "Last 40 log lines" "What went wrong?" || continue
    case "$SELECTED" in
      0) start_service "$svc" ;;
      1) stop_service "$svc" ;;
      2) restart_service "$svc" ;;
      3) echo -e "${DIM}Ctrl+C stops.${NC}"; sleep 1; with_tail tail -n 30 -F "$(log_file "$svc")" ;;
      4) [[ -f "$(log_file "$svc")" ]] && tail -40 "$(log_file "$svc")" | cut -c1-200 || echo -e "${YELLOW}No log yet${NC}" ;;
      5) log_hint "$svc" ;;
    esac
    pause
  done
}

free_port_screen() {
  clear
  printf '%s\n' "${BOLD}${BLUE} Listening sockets${NC}"
  printf '%-9s %-10s %-20s %s\n' "PORT" "PID" "PROCESS" "OWNED BY"
  rule
  local lp lpid lcomm owner
  while IFS='|' read -r lp lpid lcomm; do
    [[ "$lp" =~ ^[0-9]+$ ]] || continue
    owner="$(svc_for_port "$lp")"
    [[ -z "$lcomm" && -n "$lpid" ]] && lcomm="$(proc_cmd "$lpid")"
    printf '%-9s %-10s %-20s %s\n' "$lp" "${lpid:-?}" "${lcomm:-hidden (other user)}" \
      "$([[ -n "$owner" ]] && printf '%s' "$owner" || printf '%s' "${DIM}external${NC}")"
  done < <(listener_lines)
  rule
  read -rp "Port to free (blank to go back): " lp || return 0
  [[ "$lp" =~ ^[0-9]+$ ]] || return 0
  if ! port_is_open "$lp"; then
    echo -e "${YELLOW}Nothing listening on $lp${NC}"; pause; return 0
  fi
  lpid="$(listener_pid "$lp")"
  owner="$(svc_for_port "$lp")"
  if [[ -z "$lpid" ]]; then
    echo -e "${RED}Port $lp is held by a process your user cannot see (container or another user).${NC}"
    echo -e "${DIM}Inspect it with: sudo ss -ltnp | grep :$lp${NC}"
  elif [[ -n "$owner" ]]; then
    echo -e "${YELLOW}Port $lp belongs to managed service ${BOLD}$owner${NC} (PID $lpid)${NC}"
    confirm "Stop it through the manager?" && stop_service "$owner" 1
  else
    echo -e "${RED}PID $lpid ($(proc_cmd "$lpid")) is not managed by this script.${NC}"
    confirm "Kill it anyway?" && { kill -TERM "$lpid" 2>/dev/null; sleep 2; kill -KILL "$lpid" 2>/dev/null
      if port_is_open "$lp"; then echo -e "${RED}Port $lp still held${NC}"; else echo -e "${GREEN}Port $lp freed${NC}"; fi; }
  fi
  pause
}

watch_mode() {
  echo -e "${DIM}Live refresh every 3s — any key returns to the menu.${NC}"
  while :; do
    clear
    status_table
    echo ""
    infra_table
    printf '\n%s' "${DIM}(any key to stop)${NC}"
    IFS= read -rsn1 -t 3 _ </dev/tty && break
  done
}

main_menu() {
  select_item "CheckMeMS · $(count_up)/${#SVC_NAMES[@]} services up · $(java_label)" \
    "Status overview" \
    "Service actions (start / stop / restart / logs)" \
    "Start ALL services" \
    "Stop ALL services" \
    "Restart ALL services" \
    "Logs (one service, or all at once)" \
    "Infrastructure & endpoints" \
    "Free a port (kill a listener)" \
    "Watch mode (live refresh)" \
    "Quit  (press 0 or q)" || return 1
  case "$SELECTED" in
    0) clear; status_table; echo ""; pause ;;
    1) service_actions_loop ;;
    2) clear; status_table 0; echo ""
       confirm "Start all ${#SVC_NAMES[@]} services in order?" && { start_all; pause; } ;;
    3) clear; status_table 0; echo ""; stop_all; pause ;;
    4) clear; status_table 0; echo ""; restart_all; pause ;;
    5) clear; logs_hub ;;
    6) clear; infra_table; echo ""; pause ;;
    7) free_port_screen ;;
    8) clear; watch_mode ;;
    9) return 1 ;;
  esac
}

# ---------------------------------------------------------------- CLI

usage() {
  cat <<EOF
Usage: $(basename "$0") [command] [services...]

  (no command)         interactive menu
  status               service table
  infra                infrastructure + endpoints
  start   [all|svc...] start, waiting for each port to open
  stop    [all|svc...] stop, killing the whole process group
  restart [all|svc...] stop then start
  logs    <svc> [-n N] [-f] [PATTERN]
  kill-port <port>     free a listening port (asks before killing foreign PIDs)
  menu                 force the interactive menu

Services: ${SVC_NAMES[*]}
Toolchain: $(java_label)  (required major: $REQUIRED_JAVA_MAJOR; override with JAVA_HOME)
Tunables: START_TIMEOUT=$START_TIMEOUT  STOP_GRACE=$STOP_GRACE
Logs: $LOG_DIR   Pids: $PID_DIR
EOF
}

cli_targets() {
  TARGETS=()
  if (( $# == 0 )) || [[ "$1" == "all" ]]; then TARGETS=("${SVC_NAMES[@]}"); return; fi
  local a
  for a in "$@"; do
    is_known_svc "$a" || { echo -e "${RED}Unknown service: '$a'${NC}"; echo "Known: ${SVC_NAMES[*]}"; exit 2; }
    TARGETS+=("$a")
  done
}

free_port_for() {
  local port="$1" pid svc
  if ! port_is_open "$port"; then echo -e "${YELLOW}Nothing listening on $port${NC}"; return 0; fi
  pid="$(listener_pid "$port")"
  svc="$(svc_for_port "$port")"
  if [[ -n "$svc" ]]; then stop_service "$svc" 1; return; fi
  if [[ -z "$pid" ]]; then
    echo -e "${RED}Port $port is held by $(holder_desc "$port").${NC}"
    echo -e "${DIM}Inspect with: sudo ss -ltnp | grep :$port${NC}"
    return 1
  fi
  echo -e "${RED}PID $pid ($(proc_cmd "$pid")) is not a managed service.${NC}"
  confirm "Kill it to free port $port?" || { echo -e "${DIM}Cancelled${NC}"; return 1; }
  kill -TERM "$pid" 2>/dev/null; sleep 2; kill -KILL "$pid" 2>/dev/null
  if port_is_open "$port"; then echo -e "${RED}Port $port still held${NC}"; else echo -e "${GREEN}Port $port freed${NC}"; fi
}

run_cli() {
  local cmd="$1"; shift
  local t svc n follow pat="" f
  case "$cmd" in
    status)  status_table ;;
    infra)   infra_table ;;
    start)   cli_targets "$@"; for t in "${TARGETS[@]}"; do start_service "$t"; done ;;
    stop)    cli_targets "$@"; for t in "${TARGETS[@]}"; do stop_service "$t" 1; done ;;
    restart) cli_targets "$@"; for t in "${TARGETS[@]}"; do restart_service "$t"; done ;;
    kill-port)
      [[ "${1:-}" =~ ^[0-9]+$ ]] || { echo "Usage: $(basename "$0") kill-port <port>"; exit 2; }
      free_port_for "$1" ;;
    logs)
      svc="${1:-}"; shift || true
      is_known_svc "$svc" || { echo "Usage: $(basename "$0") logs <service> [-n N] [-f] [PATTERN]"; exit 2; }
      n=50; follow=0
      while (( $# )); do
        case "$1" in
          -f|--follow) follow=1 ;;
          -n) n="${2:-50}"; shift ;;
          -*) echo "Unknown flag: $1"; exit 2 ;;
          *)  pat="$1" ;;
        esac
        shift
      done
      f="$(log_file "$svc")"
      [[ -f "$f" ]] || { echo -e "${YELLOW}No log yet: $f${NC}"; exit 1; }
      if (( follow )); then
        if [[ -n "$pat" ]]; then tail -n "$n" -F "$f" | grep --line-buffered -iE -- "$pat"
        else tail -n "$n" -F "$f"; fi
      else
        if [[ -n "$pat" ]]; then grep -inE -- "$pat" "$f" | tail -n "$n"
        else tail -n "$n" "$f"; fi
      fi ;;
    menu) : ;;
    -h|--help|help) usage ;;
    *) echo -e "${RED}Unknown command: $cmd${NC}"; usage; exit 2 ;;
  esac
}

# ---------------------------------------------------------------- entry

discover_services
build_port_owners
if (( ${#SVC_NAMES[@]} == 0 )); then
  echo -e "${RED}No services found under $ROOT_DIR${NC}"; exit 1
fi

trap 'restore_cursor; exit 130' INT
trap restore_cursor EXIT

if (( $# > 0 )) && [[ "$1" != "menu" ]]; then
  run_cli "$@"
  exit $?
fi

if [[ ! -t 0 ]]; then
  status_table
  echo ""
  echo -e "${DIM}stdin is not a terminal — pass a command, e.g. './$(basename "$0") start all', or 'help'.$NC"
  exit 0
fi

tput civis 2>/dev/null
while main_menu; do :; done
restore_cursor
echo -e "${GREEN}Goodbye.${NC}"
