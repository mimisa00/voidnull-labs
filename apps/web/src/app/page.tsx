import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function Home() {
  const token = cookies().get('access_token');
  if (token) redirect('/dashboard');
  redirect('/login');
}
