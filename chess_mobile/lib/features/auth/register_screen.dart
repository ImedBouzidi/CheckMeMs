import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/models/user.dart';
import '../../core/services/auth_service.dart';
import '../../routing/app_router.dart';
import '../../ui/widgets/auth_showcase.dart';
import '../../ui/widgets/cm.dart';

/// Register screen, mirroring
/// `chess-web/src/app/features/auth/register/register.component.ts`.
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key, this.returnTo});

  final String? returnTo;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _username = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  String? _failure;
  bool _submitting = false;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _username.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
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
    final ok = await auth.register(
      RegisterData(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        username: _username.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
      ),
    );
    if (!mounted) return;
    setState(() => _submitting = false);
    if (!ok) {
      setState(() => _failure = 'Could not create the account. Please try again.');
      return;
    }
    context.go(widget.returnTo ?? AppRoutes.home);
  }

  InputDecoration _field(String label, String hint, IconData icon) => InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon),
      );

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
                const AuthBrand(subtitle: 'Create your account and make every move count.'),
                const SizedBox(height: 20),
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _firstName,
                              enabled: !_submitting,
                              textInputAction: TextInputAction.next,
                              decoration: _field(
                                'First name',
                                'First name',
                                Icons.person_outline_rounded,
                              ),
                              validator: (value) =>
                                  (value ?? '').trim().isEmpty ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _lastName,
                              enabled: !_submitting,
                              textInputAction: TextInputAction.next,
                              decoration: _field(
                                'Last name',
                                'Last name',
                                Icons.person_outline_rounded,
                              ),
                              validator: (value) =>
                                  (value ?? '').trim().isEmpty ? 'Required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _username,
                        enabled: !_submitting,
                        textInputAction: TextInputAction.next,
                        decoration: _field(
                          'Username',
                          'Choose a username',
                          Icons.alternate_email_rounded,
                        ),
                        validator: (value) {
                          final username = value?.trim() ?? '';
                          if (username.isEmpty) return 'Username is required';
                          if (username.length < 3) return 'At least 3 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _email,
                        enabled: !_submitting,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        decoration: _field('Email', 'you@example.com', Icons.email_outlined),
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Email is required';
                          if (!email.contains('@') || !email.contains('.')) {
                            return 'Invalid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _password,
                        enabled: !_submitting,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.newPassword],
                        decoration: InputDecoration(
                          labelText: 'Password',
                          hintText: 'At least 8 characters',
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
                          if (value == null || value.isEmpty) return 'Password is required';
                          if (value.length < 8) return 'At least 8 characters';
                          return null;
                        },
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _confirm,
                        enabled: !_submitting,
                        obscureText: _obscure,
                        onFieldSubmitted: (_) => _submit(),
                        decoration: const InputDecoration(
                          labelText: 'Confirm password',
                          hintText: 'Repeat your password',
                          prefixIcon: Icon(Icons.lock_person_outlined),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) return 'Required';
                          if (value != _password.text) return 'Passwords do not match';
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Use at least 8 characters for your password.',
                        style: tt.bodySmall?.copyWith(color: cm.mutedLight),
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
                  label: 'Create account',
                  icon: Icons.person_add_alt_1_rounded,
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
                        'Already have an account? ',
                        style: tt.bodyMedium?.copyWith(color: cm.muted),
                      ),
                      GestureDetector(
                        onTap: () =>
                            context.go(AppRoutes.login(returnTo: widget.returnTo)),
                        child: Text(
                          'Sign in',
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
