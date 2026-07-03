import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LoginButton from "@/components/LoginButton";
import styles from "./home.module.css";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className={styles.container}>
      <div className={`card ${styles.contentCard}`}>
        <div className="animate-bounce-soft">
          <span className={styles.icon} role="img" aria-label="Palette">🎨</span>
        </div>
        
        <h1 className={styles.title}>幼兒畫作小教室</h1>
        
        <p className={styles.description}>
          歡迎來到溫馨的畫作分享園地！<br />
          讓我們一起聽聽孩子分享畫裡的精彩故事。
        </p>

        <LoginButton />
        
        <div className={styles.disclaimer}>
          ※ 登入後將可儲存寶貝的對話紀錄至您的 Google 文件
        </div>
      </div>
    </main>
  );
}
