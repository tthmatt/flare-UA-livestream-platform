import Image from "next/image";
import Link from "next/link";
import flareLogo from "@/public/flare-dynamics-logo.png";
import styles from "./login.module.css";

export const metadata = {
  title: "Operator login | Flare Dynamics",
  robots: { index: false, follow: false },
};

export default async function OperatorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" aria-label="Open public viewer">
          <Image className={styles.logo} src={flareLogo} alt="Flare Dynamics" priority />
        </Link>
        <span className={styles.eyebrow}>FLARE DYNAMICS · FLIGHT OPERATIONS</span>
        <h1>Operator access</h1>
        <p>Sign in to view the DJI RTMP details and livestream gateway status.</p>

        <form action="/api/operator/login" method="post" className={styles.form}>
          <label htmlFor="password">Operator password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
          />
          {error === "invalid" && (
            <p className={styles.error}>Incorrect password. Please try again.</p>
          )}
          <button type="submit">Sign in to operator backend</button>
        </form>

        <Link className={styles.viewer} href="/">Return to public viewer</Link>
      </section>
    </main>
  );
}
