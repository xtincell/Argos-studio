import { redirect } from 'next/navigation';

export default function SignUpPage() {
  // v1 : seule la newsletter existe comme inscription. Pas de comptes utilisateur.
  redirect('/sign-in');
}
