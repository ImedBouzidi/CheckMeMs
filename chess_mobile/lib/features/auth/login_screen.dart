import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models/user.dart';
import '../../core/services/auth_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/auth_showcase.dart';
import '../../ui/widgets/cm.dart';

import '../../core/theme/app_theme.dart';


/// Login screen, mirroring
/// `chess-web/src/app/features/auth/login/login.component.ts`.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, this.returnTo});

  final String? returnTo;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  String? _failure;
  bool _submitting = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final form = _formKey.currentState;
    if (form == null || !form.validate()) return;
    final auth = context.read<AuthService>();
    setState(() {
      _submitting = true;
      _failure = null;
    });
    final ok = await auth.login(
      LoginCredentials(email: _email.text.trim(), password: _password.text),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (!ok) {
      setState(() => _failure = 'Invalid email or password. Please try again.');
      return;
    }
    context.go(widget.returnTo ?? AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final cm = context.cm;
    final tt = context.tt;
    return AuthScaffold(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AuthBackLink(
            label: 'Back to CheckMe',
            onTap: () => context.go(AppRoutes.home),
          ),
          const SizedBox(height: 4),
          CmPanel(
            padding: const EdgeInsets.all(26),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const AuthBrand(subtitle: 'Sign in to continue your chess journey.'),
                const SizedBox(height: 20),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: _email,
                        enabled: !_submitting,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          hintText: 'you@example.com',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Email is required';
                          if (!email.contains('@') || !email.contains('.')) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _password,
                        enabled: !_submitting,
                        obscureText: _obscure,
                        autofillHints: const [AutofillHints.password],
                        onFieldSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          hintText: 'Enter your password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            tooltip: _obscure ? 'Show password' : 'Hide password',
                            icon: Icon(
                              _obscure
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                            ),
                            onPressed: () => setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Password is required';
                          }
                          return null;
                        },
                      ),
                    ],
                  ),
                ),
                if (_failure != null) ...[
                  const SizedBox(height: 12),
                  CmNote(_failure!, tone: 'danger', icon: Icons.error_outline_rounded),
                ],
                const SizedBox(height: 18),
                CmPrimaryButton(
                  label: 'Sign in',
                  icon: Icons.arrow_forward_rounded,
                  loading: _submitting,
                  onPressed: _submitting ? null : _submit,
                ),
                const SizedBox(height: 16),
                const AuthDivider(text: 'or continue with'),
                const SizedBox(height: 16),
                GoogleButton(
                  label: 'Continue with Google',
                  onPressed: _submitting ? null : () {},
                ),
                const SizedBox(height: 18),
                Center(
                  child: Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        'New to CheckMe? ',
                        style: tt.bodyMedium?.copyWith(color: cm.muted),
                      ),
                      GestureDetector(
                        onTap: () =>
                            context.go(AppRoutes.register(returnTo: widget.returnTo)),
                        child: Text(
                          'Create an account',
                          style: tt.bodyMedium?.copyWith(
                            color: cm.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const AuthFooter(text: 'A calmer place to play better chess.'),
        ],
      ),
    );
  }
}
