"use client";
import styles from "./app.module.scss";
import { Button } from "antd";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

export default function Home() {
  const router = useRouter();
  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <div className={styles.title}>小黑</div>
        <div className={styles.subtitle}>最懂你的ai助手</div>
        <Button
          type="primary"
          size="large"
          className={styles.login}
          onClick={() => router.push(ROUTES.login)}
        >
          开始对话
        </Button>
      </div>
      <div className={styles.footer}>
        <p>创作者:YueLi</p>
        <p>gittee地址：xxxxxxxxxx</p>
      </div>
    </div>
  );
}
