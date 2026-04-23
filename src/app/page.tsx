"use client";
import styles from "./app.module.scss";
import { Button } from "antd";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "react-i18next";

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <div className={styles.title}>{t("common.appName")}</div>
        <div className={styles.subtitle}>{t("common.appSubtitle")}</div>
        <Button
          type="primary"
          size="large"
          className={styles.login}
          onClick={() => router.push(ROUTES.login)}
        >
          {t("common.startChat")}
        </Button>
      </div>
      <div className={styles.footer}>
        <p>{t("common.creator")}: YueLi</p>
        {/* <p>{t("common.gitee")}：xxxxxxxxxx</p> */}
      </div>
    </div>
  );
}
