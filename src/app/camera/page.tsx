import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./camera.module.css";
import CameraCapture from "@/components/CameraCapture";

export default async function CameraPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <span>←</span> 返回儀表板
        </Link>
        <h2 className="text-xl font-bold text-[var(--color-primary)]">
          {session.user?.name} 您好！
        </h2>
      </header>

      <CameraCapture />
    </div>
  );
}
