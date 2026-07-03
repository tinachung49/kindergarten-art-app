import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import styles from "./dashboard.module.css";
import { prisma } from "@/lib/prisma";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null; // or redirect
  }

  // Fetch conversation history
  const conversations = await prisma.conversation.findMany({
    where: {
      userId: session.user.id
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="avatar" />
            ) : (
              <div style={{width: '100%', height: '100%', backgroundColor: '#ffd166'}}></div>
            )}
          </div>
          <h2 className={styles.greeting}>哈囉！{session?.user?.name}</h2>
        </div>
        <LogoutButton />
      </header>

      <main className={styles.mainGrid}>
        <Link href="/camera" className={`card ${styles.cameraCard}`}>
          <div className={styles.cameraIcon}>📷</div>
          <h3 className={styles.cardTitle}>拍下新畫作</h3>
          <p className={styles.cardText}>開啟平板相機，拍下寶貝的最新作品，開始 AI 說故事！</p>
        </Link>

        <div className={`card ${styles.historyCard}`}>
          <h3 className={styles.cardTitle}>
            <span>📚</span> 歷史作品集
          </h3>
          
          {conversations.length > 0 ? (
            <div className={styles.historyList}>
              {conversations.map((conv) => (
                <a 
                  key={conv.id} 
                  href={conv.documentUrl || `https://docs.google.com/document/d/${conv.documentId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.historyItem}
                >
                  <div className={styles.historyItemIcon}>📄</div>
                  <div className={styles.historyItemContent}>
                    <div className={styles.historyItemTitle}>{conv.studentName} 的畫作故事</div>
                    <div className={styles.historyItemDate}>
                      {new Date(conv.createdAt).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>✨</span>
              <p className={styles.cardText}>目前還沒有紀錄喔！<br/>快去拍第一張畫作吧！</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
