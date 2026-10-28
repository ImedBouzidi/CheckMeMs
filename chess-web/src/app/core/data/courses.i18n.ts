import { AppLanguageCode } from '../i18n/app-i18n';
import { Course, Lesson, LessonStep } from '../models/course.models';

/**
 * Localized course copy.
 *
 * Structural data (FEN, solutions, arrows, highlights, orientation, tiers) stays
 * in `courses.seed.ts`. This file only overlays the text shown to learners, so a
 * lesson keeps working even when a translation is missing.
 *
 * Lessons are keyed by their stable course/module/lesson ids. Steps are keyed by
 * their position inside the lesson because the seed model does not give steps
 * ids yet. When adding or reordering steps, update the matching translation
 * array in the same commit.
 */

interface StepContent {
  title?: string;
  text?: string;
  hint?: string;
  success?: string;
}

interface LessonContent {
  title?: string;
  summary?: string;
  steps?: StepContent[];
}

interface ModuleContent {
  title?: string;
  summary?: string;
  lessons?: Record<string, LessonContent>;
}

interface CourseContent {
  title?: string;
  summary?: string;
  modules?: Record<string, ModuleContent>;
}

type CourseCatalog = Record<string, CourseContent>;

const fr: CourseCatalog = {
  foundations: {
    title: 'Fondations',
    summary:
      'Apprenez le déplacement des pièces, ce qui distingue un bon coup et comment gagner votre première partie.',
    modules: {
      'first-steps': {
        title: 'Premiers pas',
        summary: 'L’échiquier, les pions et les pièces mineures.',
        lessons: {
          'meet-the-board': {
            title: 'Découvrir l’échiquier',
            summary: 'Les cases, le centre et votre premier coup.',
            steps: [
              {
                title: 'Un échiquier de 64 cases',
                text:
                  'Les échecs se jouent sur un échiquier de 8×8. Les colonnes vont de a à h ; les rangées, de 1 à 8. ' +
                  'Les Blancs partent du bas, les Noirs du haut.'
              },
              {
                title: 'Le centre compte',
                text:
                  'Les quatre cases centrales sont e4, d4, e5 et d5. Une pièce placée au centre atteint davantage de cases.'
              },
              {
                title: 'Connaître la valeur des pièces',
                text:
                  'Pion 1, cavalier 3, fou 3, tour 5, dame 9. Le roi n’a pas de prix. ' +
                  'Ces nombres sont un repère, pas une règle.'
              },
              {
                title: 'Votre premier coup',
                text: 'Avancez de deux cases le pion devant votre roi.',
                hint: 'Le pion en e2 peut avancer de deux cases lors de son premier coup.',
                success: 'e4 ! Vous avez gagné de l’espace au centre.'
              },
              {
                title: 'Récapitulatif',
                text:
                  'Contrôlez le centre, développez vos pièces et gardez votre roi en sécurité. ' +
                  'Toute l’ouverture tient en une phrase.'
              }
            ]
          },
          'how-the-pawn-moves': {
            title: 'Le déplacement du pion',
            summary: 'Tout droit, deux cases une fois, et des captures en diagonale.',
            steps: [
              {
                title: 'Tout droit, une case',
                text:
                  'Les pions avancent d’une case. Lors de leur premier coup, ils peuvent en avancer de deux. ' +
                  'Ils ne reculent jamais.'
              },
              {
                title: 'Un double pas',
                text:
                  'Le pion e saute de e2 à e4. Remarquez qu’il traverse e3 sans s’y arrêter.'
              },
              {
                title: 'Essayez le double pas',
                hint: 'Avancez le pion de deux cases d’un seul coup.'
              },
              {
                title: 'Les captures se font en diagonale',
                text: 'Le pion blanc en e4 attaque d5 et f5. Capturez le pion noir en d5.',
                hint: 'Les pions capturent d’une case en diagonale vers l’avant.'
              },
              {
                title: 'Un rôle par pion',
                text:
                  'Les pions sont lents, mais ils tiennent la structure. ' +
                  'Chaque coup de pion crée une faiblesse permanente.'
              }
            ]
          },
          'knights-and-bishops': {
            title: 'Cavaliers et fous',
            summary: 'Les deux pièces à développer en premier.',
            steps: [
              {
                title: 'Deux déplacements différents',
                text:
                  'Un cavalier se déplace en L : deux cases dans un sens, une dans l’autre. Il saute par-dessus les pièces. ' +
                  'Un fou se déplace en diagonale et a besoin de lignes ouvertes.'
              },
              {
                title: 'Développez vers le centre',
                text: 'Les cavaliers sont bien en f3 et c3. Les fous recherchent les longues diagonales.'
              },
              {
                title: 'Développez un cavalier',
                text:
                  'Les Blancs ont joué e4 et les Noirs ont répondu e5. Amenez un cavalier vers le centre.',
                hint: 'Le cavalier de g1 peut sauter en f3.'
              },
              {
                title: 'Développez un fou',
                text:
                  'Le cavalier est sorti et les Noirs ont répondu Nc6. Placez le fou sur sa meilleure diagonale.',
                hint: 'Depuis c4, le fou vise f7.'
              },
              {
                title: 'Une ouverture simple',
                text:
                  '1.e4 e5 2.Nf3 Nc6 3.Bc4, c’est l’Italienne. Vous en connaissez déjà les idées.'
              }
            ]
          }
        }
      },
      'first-wins': {
        title: 'Premières victoires',
        summary: 'Échecs, captures, menaces et mat.',
        lessons: {
          'checks-captures-threats': {
            title: 'Échecs, captures, menaces',
            summary: 'Les trois coups forcing.',
            steps: [
              {
                title: 'Cherchez les coups forcing',
                text:
                  'Un échec, une capture ou une menace limitent les possibilités de votre adversaire. ' +
                  'Quand vous manquez de plan, calculez d’abord ceux-ci.'
              },
              {
                title: 'La case la plus faible',
                text:
                  'Le fou en c4 fixe f7. Ce pion n’est défendu que par le roi, ce qui en fait une cible naturelle.'
              },
              {
                title: 'Prenez le pion gratuit',
                text: 'Le pion noir en d5 est en prise. Gagnez-le.',
                hint: 'Le pion e4 attaque d5.'
              },
              {
                title: 'Respectez l’ordre des coups forcing',
                text:
                  'D’abord les échecs, puis les captures, puis les menaces. ' +
                  'La plupart des tactiques se trouvent dans cet ordre.'
              }
            ]
          },
          'checkmate-in-one': {
            title: 'Mat en un coup',
            summary: 'Terminez la partie par un mat du couloir.',
            steps: [
              {
                title: 'Qu’est-ce que le mat ?',
                text:
                  'Le mat est un échec auquel le roi ne peut échapper : il ne peut ni fuir, ni interposer une pièce, ' +
                  'ni capturer l’attaquant. La partie s’arrête immédiatement.'
              },
              {
                title: 'La dernière rangée',
                text:
                  'Le roi noir est piégé derrière ses propres pions. Une tour sur la huitième rangée suffit.'
              },
              {
                title: 'Donnez le mat',
                text: 'Aux Blancs de jouer. Mat en un coup.',
                hint: 'Faites glisser la tour sur la huitième rangée.',
                success: 'Ra8# — le roi n’a aucune échappatoire.'
              },
              {
                title: 'Pourquoi cela fonctionne',
                text:
                  'Les pions en f7, g7 et h7 retirent au roi ses propres cases. ' +
                  'C’est pourquoi il faut toujours surveiller votre dernière rangée.'
              }
            ]
          },
          'your-first-game': {
            title: 'Votre première partie',
            summary: 'Trois règles d’ouverture et une liste de contrôle.',
            steps: [
              {
                title: 'Trois règles pour l’ouverture',
                text:
                  '1. Placez un pion au centre. 2. Développez vos cavaliers et vos fous. 3. Roquez tôt. ' +
                  'Ne sortez pas la dame trop tôt.'
              },
              {
                title: 'Un début sain',
                text: 'e4, Nf3 et Bc4 : le centre, le développement et une cible en f7.'
              },
              {
                title: 'Votre liste de contrôle',
                text:
                  'À chaque coup, demandez-vous : mon roi est-il en sécurité, une pièce est-elle en prise, ' +
                  'et mon adversaire peut-il donner échec ou capturer quelque chose ?'
              },
              {
                title: 'Commencez la partie',
                text: 'Jouez le coup que vous devriez faire au premier coup.',
                hint: 'Prenez le centre.'
              },
              {
                title: 'Vous êtes prêt',
                text:
                  'Jouez une partie contre le bot, puis revenez la revoir. ' +
                  'C’est cette boucle qui vous fait progresser.'
              }
            ]
          }
        }
      }
    }
  },
  'tactical-patterns': {
    title: 'Motifs tactiques',
    summary:
      'Fourchettes, clouages et enfilades : les trois idées derrière la plupart des gains tactiques.',
    modules: {
      'win-material': {
        title: 'Les motifs qui gagnent du matériel',
        summary: 'Entraînez votre œil aux trois tactiques les plus courantes.',
        lessons: {
          'the-fork': {
            title: 'La fourchette',
            summary: 'Une pièce, deux cibles.',
            steps: [
              {
                title: 'Attaquez deux choses à la fois',
                text:
                  'Une fourchette est un seul coup qui attaque deux cibles. L’adversaire ne peut en sauver qu’une, ' +
                  'vous gagnez donc l’autre.'
              },
              {
                title: 'Une fourchette de cavalier',
                text:
                  'Le cavalier en b5 peut sauter en c7, attaquant le roi en e8 et la tour en a8.'
              },
              {
                title: 'Trouvez la fourchette',
                text: 'Aux Blancs de jouer. Attaquez le roi et la tour en un seul coup.',
                hint: 'Quelle case permet au cavalier de toucher a8 et e8 ?',
                success: 'Nc7+ fourche le roi et la tour.'
              },
              {
                title: 'L’échec d’abord',
                text:
                  'Les fourchettes accompagnées d’échec sont les plus fortes, car l’adversaire doit répondre ' +
                  'à l’échec avant de sauver l’autre pièce.'
              }
            ]
          },
          'the-pin': {
            title: 'Le clouage',
            summary: 'Immobilisez une pièce devant une pièce plus précieuse.',
            steps: [
              {
                title: 'Ne bougez pas',
                text:
                  'Une pièce clouée ne peut bouger sans exposer une pièce plus précieuse derrière elle. ' +
                  'Les clouages fonctionnent surtout contre un roi ou une dame.'
              },
              {
                title: 'Alignez le fou et le roi',
                text:
                  'Le fou en f1 peut utiliser la diagonale b5-e8 pour clouer le cavalier en c6 devant le roi.'
              },
              {
                title: 'Jouez le clouage',
                text: 'Aux Blancs de jouer. Clouez le cavalier.',
                hint: 'La diagonale depuis f1 passe par c4 jusqu’à b5.',
                success: 'Bb5 cloue le cavalier devant le roi.'
              },
              {
                title: 'Accumulez sur la pièce',
                text:
                  'Un clouage n’est pas une victoire en soi. Amenez une autre pièce pour attaquer la pièce clouée.'
              }
            ]
          },
          'the-skewer': {
            title: 'L’enfilade',
            summary: 'Le clouage à l’envers.',
            steps: [
              {
                title: 'La pièce précieuse bouge d’abord',
                text:
                  'Dans une enfilade, la pièce précieuse est devant. Vous donnez échec, elle s’écarte ' +
                  'et vous prenez ce qu’il y avait derrière.'
              },
              {
                title: 'Le roi devant, la dame derrière',
                text:
                  'Le roi noir protège la dame en a8. Un échec sur la colonne a gagnera la dame.'
              },
              {
                title: 'Lancez l’enfilade',
                text: 'Aux Blancs de jouer. Donnez échec au roi pour exposer la dame.',
                hint: 'Restez sur la colonne a, mais gardez vos distances avec le roi.',
                success: 'Ra3+ et la dame en a8 tombe ensuite.'
              },
              {
                title: 'Regardez le long des lignes',
                text:
                  'Enfilades et clouages vivent sur les rangées, les colonnes et les diagonales. ' +
                  'Balayez les lignes des pièces à longue portée.'
              }
            ]
          }
        }
      }
    }
  },
  'endgame-essentials': {
    title: 'Finales essentielles',
    summary:
      'Transformez un petit avantage en victoire : pions, tours et éviter le pat.',
    modules: {
      convert: {
        title: 'Concrétisez votre avantage',
        summary: 'Les finales qui décident des parties serrées.',
        lessons: {
          'king-and-pawn': {
            title: 'Roi et pion',
            summary: 'Promouvez le pion et utilisez votre roi.',
            steps: [
              {
                title: 'Un pion veut promouvoir',
                text:
                  'Atteindre la huitième rangée transforme un pion en dame. Dans les finales roi et pion, ' +
                  'le roi doit escorter le pion.'
              },
              {
                title: 'À un pas',
                text:
                  'Le pion en a7 est à un coup de la promotion. Le roi noir est trop loin pour l’arrêter.'
              },
              {
                title: 'Promouvez',
                text: 'Aux Blancs de jouer. Faites une dame.',
                hint: 'Poussez le pion sur la dernière rangée.',
                success: 'Une nouvelle dame — et elle donne déjà échec.'
              },
              {
                title: 'Le roi compte',
                text:
                  'En finale, le roi est une pièce combattante. Activez-le avant de pousser les pions.'
              }
            ]
          },
          'rook-cut-off': {
            title: 'La tour coupe le roi',
            summary: 'Utilisez la tour pour piéger le roi.',
            steps: [
              {
                title: 'Construisez un mur',
                text:
                  'Une tour peut couper l’échiquier en deux. Gardez le roi ennemi d’un côté ' +
                  'et avancez votre propre roi.'
              },
              {
                title: 'Échec latéral',
                text: 'La tour donne échec sur la cinquième rangée et repousse le roi noir.'
              },
              {
                title: 'Coupez le roi',
                text: 'Aux Blancs de jouer. Donnez échec et prenez la cinquième rangée.',
                hint: 'Faites monter la tour sur la colonne a.',
                success: 'Ra5+ coupe le roi sur la cinquième rangée.'
              },
              {
                title: 'Avancez ensuite',
                text:
                  'Le roi adverse coupé, rapprochez votre propre roi. La tour fait la clôture ; ' +
                  'le roi fait le travail.'
              }
            ]
          },
          'avoid-stalemate': {
            title: 'Évitez le pat',
            summary: 'Ne transformez pas une victoire en nulle.',
            steps: [
              {
                title: 'La nulle que vous n’avez pas vue',
                text:
                  'Le pat survient quand le camp au trait n’a aucun coup légal et n’est pas en échec. ' +
                  'La partie est nulle, même avec une dame sur l’échiquier.'
              },
              {
                title: 'Un piège de pat',
                text:
                  'Aux Noirs de jouer. Le roi n’a aucun coup légal et n’est pas en échec — c’est le pat.'
              },
              {
                title: 'Laissez une case au roi',
                text:
                  'Quand vous gagnez, vérifiez toujours si l’adversaire a un coup légal. ' +
                  'Laissez-lui une case de fuite jusqu’à ce que vous soyez prêt à mater.'
              },
              {
                title: 'Mat, pas pat',
                text: 'Aux Blancs de jouer. Terminez la partie.',
                hint: 'La dame peut mater à côté du roi parce que votre roi la protège.',
                success: 'Qg7# — mat, pas pat.'
              }
            ]
          }
        }
      }
    }
  }
};

const es: CourseCatalog = {
  foundations: {
    title: 'Fundamentos',
    summary:
      'Aprende cómo se mueven las piezas, qué hace buena a una jugada y cómo ganar tu primera partida.',
    modules: {
      'first-steps': {
        title: 'Primeros pasos',
        summary: 'El tablero, los peones y las piezas menores.',
        lessons: {
          'meet-the-board': {
            title: 'Conoce el tablero',
            summary: 'Las casillas, el centro y tu primera jugada.',
            steps: [
              {
                title: 'Un tablero de 64 casillas',
                text:
                  'El ajedrez se juega en un tablero de 8×8. Las columnas van de la a a la h; las filas, del 1 al 8. ' +
                  'Las blancas empiezan abajo y las negras arriba.'
              },
              {
                title: 'El centro importa',
                text:
                  'Las cuatro casillas centrales son e4, d4, e5 y d5. Las piezas situadas en el centro alcanzan más casillas.'
              },
              {
                title: 'Conoce el valor de las piezas',
                text:
                  'Peón 1, caballo 3, alfil 3, torre 5, dama 9. El rey no tiene precio. ' +
                  'Estos números son una guía, no una regla.'
              },
              {
                title: 'Tu primera jugada',
                text: 'Avanza dos casillas el peón que está delante de tu rey.',
                hint: 'El peón de e2 puede avanzar dos casillas en su primera jugada.',
                success: '¡e4! Te has hecho con el espacio en el centro.'
              },
              {
                title: 'Resumen',
                text:
                  'Controla el centro, desarrolla tus piezas y mantén a tu rey seguro. ' +
                  'Toda la apertura cabe en una frase.'
              }
            ]
          },
          'how-the-pawn-moves': {
            title: 'Cómo se mueve el peón',
            summary: 'Hacia delante, dos casillas una vez y capturas en diagonal.',
            steps: [
              {
                title: 'Recto, una casilla',
                text:
                  'Los peones avanzan una casilla. En su primera jugada pueden avanzar dos. ' +
                  'Nunca retroceden.'
              },
              {
                title: 'Un avance doble',
                text:
                  'El peón de e salta de e2 a e4. Fíjate en que pasa por e3 sin detenerse allí.'
              },
              {
                title: 'Prueba el avance doble',
                hint: 'Mueve el peón dos casillas de una vez.'
              },
              {
                title: 'Las capturas van en diagonal',
                text: 'El peón blanco de e4 ataca d5 y f5. Captura el peón negro de d5.',
                hint: 'Los peones capturan una casilla en diagonal hacia delante.'
              },
              {
                title: 'Una tarea por peón',
                text:
                  'Los peones son lentos, pero mantienen la estructura. ' +
                  'Cada jugada de peón crea una debilidad permanente.'
              }
            ]
          },
          'knights-and-bishops': {
            title: 'Caballos y alfiles',
            summary: 'Las dos piezas que desarrollas primero.',
            steps: [
              {
                title: 'Dos formas distintas de moverse',
                text:
                  'Un caballo se mueve en L: dos casillas en una dirección y una en la otra. Salta por encima de las piezas. ' +
                  'Un alfil se mueve en diagonal y necesita líneas abiertas.'
              },
              {
                title: 'Desarrolla hacia el centro',
                text: 'Los caballos están bien en f3 y c3. Los alfiles buscan diagonales largas.'
              },
              {
                title: 'Desarrolla un caballo',
                text:
                  'Las blancas han jugado e4 y las negras han respondido e5. Lleva un caballo hacia el centro.',
                hint: 'El caballo de g1 puede saltar a f3.'
              },
              {
                title: 'Desarrolla un alfil',
                text:
                  'El caballo ha salido y las negras han respondido Nc6. Coloca el alfil en su mejor diagonal.',
                hint: 'Desde c4, el alfil apunta a f7.'
              },
              {
                title: 'Una apertura sencilla',
                text:
                  '1.e4 e5 2.Nf3 Nc6 3.Bc4 es la Italiana. Ya conoces las ideas que hay detrás.'
              }
            ]
          }
        }
      },
      'first-wins': {
        title: 'Primeras victorias',
        summary: 'Jaques, capturas, amenazas y mate.',
        lessons: {
          'checks-captures-threats': {
            title: 'Jaques, capturas, amenazas',
            summary: 'Las tres jugadas forzadas.',
            steps: [
              {
                title: 'Busca jugadas forzadas',
                text:
                  'Un jaque, una captura o una amenaza limitan lo que puede hacer tu rival. ' +
                  'Cuando no tengas un plan, calcula primero estas jugadas.'
              },
              {
                title: 'La casilla más débil',
                text:
                  'El alfil de c4 apunta a f7. Ese peón solo está defendido por el rey, ' +
                  'lo que lo convierte en un objetivo natural.'
              },
              {
                title: 'Toma el peón gratis',
                text: 'El peón negro de d5 está colgando. Gánatelo.',
                hint: 'El peón e4 ataca d5.'
              },
              {
                title: 'Respeta el orden de las jugadas forzadas',
                text:
                  'Primero jaques, luego capturas y después amenazas. ' +
                  'La mayoría de las tácticas aparecen en ese orden.'
              }
            ]
          },
          'checkmate-in-one': {
            title: 'Jaque mate en una',
            summary: 'Termina la partida con un mate de la última fila.',
            steps: [
              {
                title: 'Qué es el jaque mate',
                text:
                  'El jaque mate es un jaque del que el rey no puede escapar: no puede moverse, bloquear ' +
                  'ni capturar al atacante. La partida termina de inmediato.'
              },
              {
                title: 'La última fila',
                text:
                  'El rey negro está atrapado detrás de sus propios peones. Basta una torre en la octava fila.'
              },
              {
                title: 'Da el mate',
                text: 'Juegan las blancas. Mate en una.',
                hint: 'Desliza la torre hasta la octava fila.',
                success: 'Ra8#: el rey no tiene escapatoria.'
              },
              {
                title: 'Por qué funciona',
                text:
                  'Los peones de f7, g7 y h7 le quitan al rey sus propias casillas. ' +
                  'Por eso conviene vigilar siempre tu última fila.'
              }
            ]
          },
          'your-first-game': {
            title: 'Tu primera partida',
            summary: 'Tres reglas de apertura y una lista de comprobación.',
            steps: [
              {
                title: 'Tres reglas para la apertura',
                text:
                  '1. Pon un peón en el centro. 2. Desarrolla tus caballos y alfiles. 3. Enroca pronto. ' +
                  'No saques la dama demasiado pronto.'
              },
              {
                title: 'Un comienzo saludable',
                text: 'e4, Nf3 y Bc4: centro, desarrollo y un objetivo en f7.'
              },
              {
                title: 'Tu lista de comprobación',
                text:
                  'En cada jugada pregúntate: ¿está mi rey seguro, hay algo colgando ' +
                  'y puede mi rival dar jaque o capturar algo?'
              },
              {
                title: 'Empieza la partida',
                text: 'Juega la jugada que deberías hacer en la primera jugada.',
                hint: 'Reclama el centro.'
              },
              {
                title: 'Ya estás listo',
                text:
                  'Juega una partida contra el bot y luego vuelve a revisarla. ' +
                  'Ese ciclo es lo que te hace mejorar.'
              }
            ]
          }
        }
      }
    }
  },
  'tactical-patterns': {
    title: 'Patrones tácticos',
    summary:
      'Horquillas, clavadas y enfiladas: las tres ideas detrás de la mayoría de las victorias tácticas.',
    modules: {
      'win-material': {
        title: 'Patrones que ganan material',
        summary: 'Entrena tu ojo con las tres tácticas más comunes.',
        lessons: {
          'the-fork': {
            title: 'La horquilla',
            summary: 'Una pieza, dos objetivos.',
            steps: [
              {
                title: 'Ataca dos cosas a la vez',
                text:
                  'Una horquilla es una sola jugada que ataca dos objetivos. El rival solo puede salvar uno, ' +
                  'así que te llevas el otro.'
              },
              {
                title: 'Una horquilla de caballo',
                text:
                  'El caballo de b5 puede saltar a c7, atacando al rey de e8 y a la torre de a8.'
              },
              {
                title: 'Encuentra la horquilla',
                text: 'Juegan las blancas. Ataca al rey y a la torre con una sola jugada.',
                hint: '¿Qué casilla permite al caballo tocar a8 y e8?',
                success: 'Nc7+ hace una horquilla al rey y a la torre.'
              },
              {
                title: 'Primero el jaque',
                text:
                  'Las horquillas con jaque son las más fuertes, porque el rival debe responder al jaque ' +
                  'antes de salvar la otra pieza.'
              }
            ]
          },
          'the-pin': {
            title: 'La clavada',
            summary: 'Inmoviliza una pieza contra otra más valiosa.',
            steps: [
              {
                title: 'No te muevas',
                text:
                  'Una pieza clavada no puede moverse sin exponer algo más valioso detrás de ella. ' +
                  'Las clavadas funcionan mejor contra un rey o una dama.'
              },
              {
                title: 'Alinea el alfil y el rey',
                text:
                  'El alfil de f1 puede usar la diagonal b5-e8 para clavar el caballo de c6 contra el rey.'
              },
              {
                title: 'Juega la clavada',
                text: 'Juegan las blancas. Clava el caballo.',
                hint: 'La diagonal desde f1 pasa por c4 hasta b5.',
                success: 'Bb5 clava el caballo contra el rey.'
              },
              {
                title: 'Acumula ataques',
                text:
                  'Una clavada no gana por sí sola. Lleva otra pieza para atacar la pieza clavada.'
              }
            ]
          },
          'the-skewer': {
            title: 'La enfilada',
            summary: 'La clavada al revés.',
            steps: [
              {
                title: 'La pieza valiosa se mueve primero',
                text:
                  'En una enfilada, la pieza valiosa está delante. Le das jaque, se aparta ' +
                  'y capturas lo que había detrás.'
              },
              {
                title: 'Rey delante, dama detrás',
                text:
                  'El rey negro protege a la dama de a8. Un jaque en la columna a ganará la dama.'
              },
              {
                title: 'Inicia la enfilada',
                text: 'Juegan las blancas. Da jaque al rey para dejar expuesta a la dama.',
                hint: 'Quédate en la columna a, pero mantén la distancia con el rey.',
                success: 'Ra3+ y la dama de a8 cae después.'
              },
              {
                title: 'Mira a lo largo de las líneas',
                text:
                  'Las enfiladas y las clavadas viven en filas, columnas y diagonales. ' +
                  'Recorre las líneas de las piezas de largo alcance.'
              }
            ]
          }
        }
      }
    }
  },
  'endgame-essentials': {
    title: 'Finales esenciales',
    summary:
      'Convierte una pequeña ventaja en victoria: peones, torres y evitar el ahogado.',
    modules: {
      convert: {
        title: 'Convierte tu ventaja',
        summary: 'Los finales que deciden las partidas ajustadas.',
        lessons: {
          'king-and-pawn': {
            title: 'Rey y peón',
            summary: 'Corona el peón y usa tu rey.',
            steps: [
              {
                title: 'Un peón quiere coronar',
                text:
                  'Llegar a la octava fila convierte un peón en dama. En los finales de rey y peón, ' +
                  'el rey debe escoltar al peón.'
              },
              {
                title: 'A un paso',
                text:
                  'El peón de a7 está a una jugada de coronar. El rey negro está demasiado lejos para detenerlo.'
              },
              {
                title: 'Corona',
                text: 'Juegan las blancas. Haz una dama.',
                hint: 'Empuja el peón hasta la última fila.',
                success: 'Una nueva dama... ¡y ya da jaque!'
              },
              {
                title: 'El rey importa',
                text:
                  'En el final, el rey es una pieza de combate. Actívalo antes de empujar los peones.'
              }
            ]
          },
          'rook-cut-off': {
            title: 'La torre corta el paso',
            summary: 'Usa la torre para atrapar al rey.',
            steps: [
              {
                title: 'Construye un muro',
                text:
                  'Una torre puede partir el tablero en dos. Mantén al rey enemigo a un lado ' +
                  'y avanza tu propio rey.'
              },
              {
                title: 'Jaque lateral',
                text: 'La torre da jaque a lo largo de la quinta fila y empuja al rey negro hacia atrás.'
              },
              {
                title: 'Corta al rey',
                text: 'Juegan las blancas. Da jaque y toma la quinta fila.',
                hint: 'Sube la torre por la columna a.',
                success: 'Ra5+ corta al rey a lo largo de la quinta fila.'
              },
              {
                title: 'Después, acércate',
                text:
                  'Con el rey rival cortado, acerca tu propio rey. La torre pone la valla; ' +
                  'el rey hace el trabajo.'
              }
            ]
          },
          'avoid-stalemate': {
            title: 'Evita el ahogado',
            summary: 'No conviertas una victoria en tablas.',
            steps: [
              {
                title: 'Las tablas que no viste',
                text:
                  'El ahogado ocurre cuando el bando al que le toca mover no tiene jugadas legales ' +
                  'y no está en jaque. La partida son tablas, incluso con una dama en el tablero.'
              },
              {
                title: 'Una trampa de ahogado',
                text:
                  'Juegan las negras. El rey no tiene jugadas legales y no está en jaque: esto es ahogado.'
              },
              {
                title: 'Dale una casilla al rey',
                text:
                  'Cuando vas ganando, comprueba siempre si el rival tiene alguna jugada legal. ' +
                  'Déjale una casilla de escape hasta que estés listo para dar mate.'
              },
              {
                title: 'Mate, no ahogado',
                text: 'Juegan las blancas. Termina la partida.',
                hint: 'La dama puede dar mate junto al rey porque tu rey la protege.',
                success: 'Qg7#: mate, no ahogado.'
              }
            ]
          }
        }
      }
    }
  }
};

const ar: CourseCatalog = {
  foundations: {
    title: 'الأساسيات',
    summary:
      'تعرّف على طريقة تحرّك القطع، وما تبدو عليه النقلة الجيدة، وكيف تفوز بأول مباراة لك.',
    modules: {
      'first-steps': {
        title: 'الخطوات الأولى',
        summary: 'الرقعة والبيادق والقطع الصغيرة.',
        lessons: {
          'meet-the-board': {
            title: 'تعرّف على الرقعة',
            summary: 'المربعات والمركز وأول نقلة لك.',
            steps: [
              {
                title: 'رقعة من 64 مربعًا',
                text:
                  'تُلعب لعبة الشطرنج على رقعة من 8×8. الأعمدة هي من a إلى h، والصفوف من 1 إلى 8. ' +
                  'يبدأ الأبيض من الأسفل والأسود من الأعلى.'
              },
              {
                title: 'المركز مهم',
                text:
                  'المربعات الأربعة في الوسط هي e4 وd4 وe5 وd5. ' +
                  'القطع الموجودة في المركز تصل إلى مربعات أكثر.'
              },
              {
                title: 'اعرف قيمة القطع',
                text:
                  'البيدق 1، الحصان 3، الفيل 3، الرخ 5، الوزير 9. أما الملك فلا يُقدَّر بثمن. ' +
                  'هذه الأرقام إرشادية وليست قاعدة.'
              },
              {
                title: 'نقلتك الأولى',
                text: 'حرّك البيدق الذي أمام ملكك مربعين إلى الأمام.',
                hint: 'يمكن للبيدق الموجود في e2 أن يتحرك مربعين في نقلته الأولى.',
                success: 'e4! لقد كسبت مساحة في المركز.'
              },
              {
                title: 'خلاصة',
                text:
                  'سيطر على المركز، وطوّر قطعك، وحافظ على سلامة ملكك. ' +
                  'هذه هي الافتتاحية كاملة في جملة واحدة.'
              }
            ]
          },
          'how-the-pawn-moves': {
            title: 'كيف يتحرّك البيدق',
            summary: 'إلى الأمام، مربعان مرة واحدة، والالتقاط على القطر.',
            steps: [
              {
                title: 'إلى الأمام، مربع واحد',
                text:
                  'تتحرك البيادق مربعًا واحدًا إلى الأمام. وفي نقلتها الأولى يمكنها التحرك مربعين. ' +
                  'ولا يمكنها التراجع أبدًا.'
              },
              {
                title: 'خطوة مزدوجة',
                text:
                  'يقفز بيدق e من e2 إلى e4. لاحظ أنه يمر عبر e3 دون التوقف فيه.'
              },
              {
                title: 'جرّب الخطوة المزدوجة',
                hint: 'حرّك البيدق مربعين دفعة واحدة.'
              },
              {
                title: 'الالتقاط يكون قطريًا',
                text: 'البيدق الأبيض في e4 يهاجم d5 وf5. التقط البيدق الأسود في d5.',
                hint: 'تلتقط البيادق مربعًا واحدًا قطريًا إلى الأمام.'
              },
              {
                title: 'مهمة واحدة لكل بيدق',
                text:
                  'البيادق بطيئة لكنها تحافظ على تماسك البنية. ' +
                  'وكل نقلة بيدق تخلق ضعفًا دائمًا.'
              }
            ]
          },
          'knights-and-bishops': {
            title: 'الأحصنة والفيلة',
            summary: 'القطعتان اللتان تطوّرهما أولًا.',
            steps: [
              {
                title: 'طريقتان مختلفتان للحركة',
                text:
                  'يتحرك الحصان على شكل حرف L: مربعان في اتجاه ومربع في اتجاه آخر. وهو يقفز فوق القطع. ' +
                  'ويتحرك الفيل قطريًا ويحتاج إلى خطوط مفتوحة.'
              },
              {
                title: 'طوّر نحو المركز',
                text: 'مكان الأحصنة المفضّل هو f3 وc3. أما الفيلة فتحب الأقطار الطويلة.'
              },
              {
                title: 'طوّر حصانًا',
                text:
                  'لعب الأبيض e4 وردّ الأسود بـ e5. قرّب حصانًا نحو المركز.',
                hint: 'يمكن لحصان g1 القفز إلى f3.'
              },
              {
                title: 'طوّر فيلًا',
                text:
                  'خرج الحصان وردّ الأسود بـ Nc6. ضع الفيل على أفضل قطر له.',
                hint: 'من c4 يستهدف الفيل المربع f7.'
              },
              {
                title: 'افتتاحية بسيطة',
                text:
                  '1.e4 e5 2.Nf3 Nc6 3.Bc4 هي الافتتاحية الإيطالية. أنت تعرف أفكارها الآن.'
              }
            ]
          }
        }
      },
      'first-wins': {
        title: 'أول الانتصارات',
        summary: 'الكش والالتقاط والتهديد وكش مات.',
        lessons: {
          'checks-captures-threats': {
            title: 'الكش والالتقاط والتهديد',
            summary: 'النقلات الثلاث المفروضة.',
            steps: [
              {
                title: 'ابحث عن النقلات المفروضة',
                text:
                  'الكش أو الالتقاط أو التهديد يحدّ من خيارات خصمك. ' +
                  'وعندما لا تجد خطة، احسب هذه النقلات أولًا.'
              },
              {
                title: 'أضعف مربع',
                text:
                  'الفيل في c4 ينظر إلى f7. هذا البيدق يحميه الملك فقط، ما يجعله هدفًا طبيعيًا.'
              },
              {
                title: 'خذ البيدق المجاني',
                text: 'البيدق الأسود في d5 مكشوف. اكسبه.',
                hint: 'البيدق e4 يهاجم d5.'
              },
              {
                title: 'تحقّق من ترتيب النقلات المفروضة',
                text:
                  'الكش أولًا، ثم الالتقاط، ثم التهديد. ' +
                  'معظم التكتيكات تُوجد بهذا الترتيب.'
              }
            ]
          },
          'checkmate-in-one': {
            title: 'كش مات في نقلة واحدة',
            summary: 'أنهِ المباراة بكش مات على الصف الأخير.',
            steps: [
              {
                title: 'ما هو كش مات؟',
                text:
                  'كش مات هو كش لا يستطيع الملك الهروب منه: فلا يمكنه التحرك أو الحجب ' +
                  'أو التقاط المهاجم. وتنتهي المباراة فورًا.'
              },
              {
                title: 'الصف الأخير',
                text:
                  'ملك الأسود محاصر خلف بيادقه. ويكفي رخ على الصف الثامن.'
              },
              {
                title: 'نفّذ كش مات',
                text: 'الدور للأبيض. كش مات في نقلة واحدة.',
                hint: 'حرّك الرخ إلى الصف الثامن.',
                success: 'Ra8# — لا مفرّ للملك.'
              },
              {
                title: 'لماذا تنجح؟',
                text:
                  'البيادق في f7 وg7 وh7 تسدّ على الملك مربعاته. ' +
                  'لهذا نقول إن عليك دائمًا مراقبة صفك الأخير.'
              }
            ]
          },
          'your-first-game': {
            title: 'مباراتك الأولى',
            summary: 'ثلاث قواعد للافتتاحية وقائمة تحقق.',
            steps: [
              {
                title: 'ثلاث قواعد للافتتاحية',
                text:
                  '1. ضع بيدقًا في المركز. 2. طوّر أحصنتك وفيلتك. 3. قم بالتبييت مبكرًا. ' +
                  'لا تُخرج الوزير مبكرًا جدًا.'
              },
              {
                title: 'بداية سليمة',
                text: 'e4 وNf3 وBc4: المركز والتطوير وهدف على f7.'
              },
              {
                title: 'قائمة التحقق',
                text:
                  'اسأل نفسك قبل كل نقلة: هل ملكي آمن؟ هل هناك قطعة مكشوفة؟ ' +
                  'وهل يستطيع خصمي إعطاء كش أو التقاط شيء؟'
              },
              {
                title: 'ابدأ المباراة',
                text: 'العب النقلة التي ينبغي أن تبدأ بها.',
                hint: 'سيطر على المركز.'
              },
              {
                title: 'أنت جاهز',
                text:
                  'العب مباراة ضد البوت، ثم عُد وراجعها. ' +
                  'هذه الحلقة هي طريقة تحسّنك.'
              }
            ]
          }
        }
      }
    }
  },
  'tactical-patterns': {
    title: 'الأنماط التكتيكية',
    summary:
      'الشوكة والتثبيت والسيخ: الأفكار الثلاث خلف معظم الانتصارات التكتيكية.',
    modules: {
      'win-material': {
        title: 'أنماط تكسب المادة',
        summary: 'درّب عينك على التكتيكات الثلاثة الأكثر شيوعًا.',
        lessons: {
          'the-fork': {
            title: 'الشوكة',
            summary: 'قطعة واحدة وهدفان.',
            steps: [
              {
                title: 'هاجم هدفين في وقت واحد',
                text:
                  'الشوكة هي نقلة واحدة تهاجم هدفين. لا يستطيع الخصم إنقاذ سوى واحد، ' +
                  'فتكسب الآخر.'
              },
              {
                title: 'شوكة حصان',
                text:
                  'يمكن للحصان في b5 القفز إلى c7، مهاجمًا الملك في e8 والرخ في a8.'
              },
              {
                title: 'اعثر على الشوكة',
                text: 'الدور للأبيض. هاجم الملك والرخ بنقلة واحدة.',
                hint: 'أي مربع يسمح للحصان بالوصول إلى a8 وe8 معًا؟',
                success: 'Nc7+ تشوك الملك والرخ.'
              },
              {
                title: 'الكش أولًا',
                text:
                  'أقوى الشوكات تلك التي تأتي مع كش، لأن الخصم مضطر للرد على الكش ' +
                  'قبل إنقاذ القطعة الأخرى.'
              }
            ]
          },
          'the-pin': {
            title: 'التثبيت',
            summary: 'ثبّت قطعة أمام قطعة أكثر قيمة.',
            steps: [
              {
                title: 'لا تتحرك',
                text:
                  'القطعة المثبتة لا تستطيع التحرك دون كشف شيء أكثر قيمة خلفها. ' +
                  'ويكون التثبيت أقوى على الملك أو الوزير.'
              },
              {
                title: 'اصطف الفيل والملك',
                text:
                  'يمكن للفيل في f1 استخدام القطر b5-e8 لتثبيت حصان c6 أمام الملك.'
              },
              {
                title: 'نفّذ التثبيت',
                text: 'الدور للأبيض. ثبّت الحصان.',
                hint: 'القطر من f1 يمر عبر c4 إلى b5.',
                success: 'Bb5 يثبّت الحصان أمام الملك.'
              },
              {
                title: 'راكم الهجوم عليه',
                text:
                  'التثبيت ليس فوزًا بحد ذاته. اجلب قطعة أخرى لمهاجمة القطعة المثبتة.'
              }
            ]
          },
          'the-skewer': {
            title: 'السيخ',
            summary: 'التثبيت معكوسًا.',
            steps: [
              {
                title: 'القطعة الثمينة تتحرك أولًا',
                text:
                  'في السيخ تكون القطعة الثمينة في المقدمة. تعطيها كشًا، فتتنحى جانبًا، ' +
                  'ثم تأخذ ما كان خلفها.'
              },
              {
                title: 'الملك في المقدمة والوزير خلفه',
                text:
                  'ملك الأسود يحمي الوزير في a8. وكش على عمود a سيكسب الوزير.'
              },
              {
                title: 'ابدأ السيخ',
                text: 'الدور للأبيض. أعطِ كشًا للملك لينكشف الوزير.',
                hint: 'ابقَ على عمود a، لكن حافظ على مسافة من الملك.',
                success: 'Ra3+ ثم يسقط الوزير في a8 بعدها.'
              },
              {
                title: 'انظر على طول الخطوط',
                text:
                  'السيخ والتثبيت يعيشان على الصفوف والأعمدة والأقطار. ' +
                  'امسح خطوط القطع بعيدة المدى.'
              }
            ]
          }
        }
      }
    }
  },
  'endgame-essentials': {
    title: 'أساسيات نهاية اللعب',
    summary:
      'حوّل ميزة صغيرة إلى فوز: البيادق وقطع الرخ وتجنّب الجمود.',
    modules: {
      convert: {
        title: 'حوّل ميزتك إلى فوز',
        summary: 'النهايات التي تحسم المباريات المتقاربة.',
        lessons: {
          'king-and-pawn': {
            title: 'الملك والبيدق',
            summary: 'رقِّ البيدق واستخدم ملكك.',
            steps: [
              {
                title: 'البيدق يريد الترقية',
                text:
                  'الوصول إلى الصف الثامن يحوّل البيدق إلى وزير. وفي نهايات الملك والبيدق، ' +
                  'يجب أن يرافق الملك البيدق.'
              },
              {
                title: 'خطوة واحدة تفصل',
                text:
                  'البيدق في a7 على بعد نقلة من الترقية. وملك الأسود بعيد جدًا عن إيقافه.'
              },
              {
                title: 'رقِّ البيدق',
                text: 'الدور للأبيض. اصنع وزيرًا.',
                hint: 'ادفع البيدق إلى الصف الأخير.',
                success: 'وزير جديد — وهو يعطي كشًا بالفعل.'
              },
              {
                title: 'الملك مهم',
                text:
                  'في نهاية اللعب يكون الملك قطعة قتالية. فعّله قبل دفع البيادق.'
              }
            ]
          },
          'rook-cut-off': {
            title: 'قطع الطريق بالرخ',
            summary: 'استخدم الرخ لمحاصرة الملك.',
            steps: [
              {
                title: 'ابنِ جدارًا',
                text:
                  'يمكن للرخ أن يقسم الرقعة إلى نصفين. أبقِ ملك الخصم في جانب، ' +
                  'وقدّم ملكك إلى الأمام.'
              },
              {
                title: 'كش من الجانب',
                text: 'يعطي الرخ كشًا على طول الصف الخامس ويدفع ملك الأسود إلى الخلف.'
              },
              {
                title: 'اقطع طريق الملك',
                text: 'الدور للأبيض. أعطِ كشًا واسيطر على الصف الخامس.',
                hint: 'حرّك الرخ صاعدًا على عمود a.',
                success: 'Ra5+ يقطع طريق الملك على الصف الخامس.'
              },
              {
                title: 'ثم اقترب',
                text:
                  'بعد قطع طريق الملك، قرّب ملكك. الرخ يضع السياج والملك يقوم بالعمل.'
              }
            ]
          },
          'avoid-stalemate': {
            title: 'تجنّب الجمود',
            summary: 'لا تحوّل الفوز إلى تعادل.',
            steps: [
              {
                title: 'التعادل الذي لم تره',
                text:
                  'الجمود هو أن يكون دور اللاعب ولا يملك أي نقلة قانونية وهو غير مكش. ' +
                  'وتنتهي المباراة بالتعادل حتى لو وُجد وزير على الرقعة.'
              },
              {
                title: 'فخّ الجمود',
                text:
                  'الدور للأسود. لا يملك الملك أي نقلة قانونية وهو غير مكش — هذا هو الجمود.'
              },
              {
                title: 'امنح الملك مربعًا',
                text:
                  'عندما تكون فائزًا، تحقّق دائمًا من أن للخصم نقلة قانونية. ' +
                  'واترك له مربع هروب واحد حتى تصبح جاهزًا لكش مات.'
              },
              {
                title: 'كش مات، لا جمود',
                text: 'الدور للأبيض. أنهِ المباراة.',
                hint: 'يمكن للوزير أن ينفّذ كش مات بجوار الملك لأن ملكك يحميه.',
                success: 'Qg7# — كش مات، وليس جمودًا.'
              }
            ]
          }
        }
      }
    }
  }
};

const COURSE_CONTENT: Record<AppLanguageCode, CourseCatalog> = {
  en: {},
  fr,
  es,
  ar
};

export function localizeCourses(
  courses: ReadonlyArray<Course>,
  language: AppLanguageCode
): ReadonlyArray<Course> {
  if (language === 'en') return courses;

  const catalog = COURSE_CONTENT[language];
  return courses.map(course => localizeCourse(course, catalog[course.id]));
}

function localizeCourse(course: Course, content: CourseContent | undefined): Course {
  if (!content) return course;

  return {
    ...course,
    title: content.title ?? course.title,
    summary: content.summary ?? course.summary,
    modules: course.modules.map(module => {
      const moduleContent = content.modules?.[module.id];
      if (!moduleContent) return module;

      return {
        ...module,
        title: moduleContent.title ?? module.title,
        summary: moduleContent.summary ?? module.summary,
        lessons: module.lessons.map(lesson =>
          localizeLesson(lesson, moduleContent.lessons?.[lesson.id])
        )
      };
    })
  };
}

function localizeLesson(lesson: Lesson, content: LessonContent | undefined): Lesson {
  if (!content) return lesson;

  return {
    ...lesson,
    title: content.title ?? lesson.title,
    summary: content.summary ?? lesson.summary,
    steps: content.steps?.length
      ? lesson.steps.map((step, index) => localizeStep(step, content.steps?.[index]))
      : lesson.steps
  };
}

function localizeStep(step: LessonStep, content: StepContent | undefined): LessonStep {
  if (!content) return step;

  if (step.kind === 'task') {
    return {
      ...step,
      title: content.title ?? step.title,
      text: content.text ?? step.text,
      hint: content.hint ?? step.hint,
      success: content.success ?? step.success
    };
  }

  return {
    ...step,
    title: content.title ?? step.title,
    text: content.text ?? step.text
  };
}
