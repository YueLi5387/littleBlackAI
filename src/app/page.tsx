import Image from "next/image";
import Link from "next/link"; // Next.js 内置链接组件
import styles from "./app.module.scss";
import { Button } from "antd";

export default function Home() {
  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <div className={styles.title}>小黑</div>
        <div className={styles.subtitle}>最懂你的ai助手</div>
        <Link style={{ textDecoration: "none" }} href="/view/loginPage">
          <Button type="primary" size="large" className={styles.login}>
            点击登录
          </Button>
        </Link>
      </div>
      <div className={styles.footer}>
        <p>创作者:YueLi</p>
        <p>gittee地址：xxxxxxxxxx</p>
      </div>
    </div>
  );
}
