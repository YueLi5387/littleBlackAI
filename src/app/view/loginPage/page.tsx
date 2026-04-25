"use client";
import { Button, Card, Checkbox, Form, Input, message, Segmented } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import styles from "./login.module.scss";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notification } from "antd";
import type { FormInstance } from "antd";
import { ROUTES } from "@/lib/constants/routes";
import { useUserStore } from "@/store/userStore";
import { useTranslation } from "react-i18next";

function LoginContent() {
  const { t } = useTranslation();
  const [head, setHead] = useState(t("common.login"));
  const [isLoading, setIsLoading] = useState(false); //加载状态

  // 路由跳转
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<FormInstance | null>(null);
  const { user, setUser } = useUserStore();

  const changeLogin = (value: string) => {
    formRef.current?.resetFields(); //清空表单
    // 如果是切换到登录，且仓库有存储的用户信息，则自动填充
    if (value === t("common.login") && user) {
      setTimeout(() => {
        formRef.current?.setFieldsValue({
          email: user.username,
          password: user.password,
          remember: true,
        });
      }, 0);
    }
    setHead(value);
  };
  const [messageApi, contextHolder] = message.useMessage();
  const [notificationAPI, notificationHolder] = notification.useNotification();

  useEffect(() => {
    if (searchParams.get("auth_error") === "1") {
      notificationAPI.warning({
        message: t("common.emailVerifyFailed"),
        description: t("common.emailVerifyDesc"),
      });
    }
    // 初始进入页面，如果仓库有用户信息，自动填充
    if (head === t("common.login") && user) {
      formRef.current?.setFieldsValue({
        email: user.username,
        password: user.password,
        remember: true,
      });
    }
  }, [notificationAPI, searchParams, user, head, t]);

  // 登录
  const supabase = createClient();
  const getLoginErrorTip = (error: unknown) => {
    if (!(error instanceof Error)) return t("common.loginFailed");
    const normalized = error.message.toLowerCase();
    if (normalized.includes("email not confirmed")) {
      return t("common.emailNotConfirmed");
    }
    if (normalized.includes("invalid login credentials")) {
      return t("common.invalidCredentials");
    }
    return error.message;
  };

  const onFinishLogin = async (values: {
    email: string;
    password: string;
    remember: boolean;
  }) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;

      // 处理“记住我”逻辑
      if (values.remember) {
        setUser({ username: values.email, password: values.password });
      } else {
        setUser(null);
      }

      messageApi.open({
        type: "success",
        content: t("common.loginSuccess"),
      });
      router.push(ROUTES.chatHome);
    } catch (error: unknown) {
      messageApi.open({
        type: "error",
        content: getLoginErrorTip(error),
      });
    } finally {
      setIsLoading(false);
    }
  };
  // 注册
  const onFinishRegister = async (values: {
    email: string;
    password: string;
  }) => {
    setIsLoading(true);
    try {
      const emailRedirectTo = `${window.location.origin}${
        ROUTES.authConfirm
      }?next=${encodeURIComponent(ROUTES.chatHome)}`;

      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo,
        },
      });
      if (error) throw error;

      notificationAPI["warning"]({
        title: t("common.registerSuccess"),
        description: t("common.registerCheckEmail"),
      });
      changeLogin(t("common.login"));
    } catch (error: unknown) {
      messageApi.open({
        type: "error",
        content:
          error instanceof Error ? error.message : t("common.registerFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      {contextHolder}
      {notificationHolder}

      <Card className={styles.login}>
        <Segmented
          options={[t("common.login"), t("common.register")]}
          value={head}
          onChange={changeLogin}
          className={styles.header}
        />
        <div className={styles.content}>
          {head === t("common.login") ? (
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinishLogin}
              autoComplete="off"
              ref={formRef}
            >
              <Form.Item
                label={t("common.email")}
                name="email"
                rules={[
                  { required: true, message: t("common.placeholder") },
                  { type: "email", message: t("common.email") },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={t("common.password")}
                name="password"
                rules={[
                  { required: true, message: t("common.placeholder") },
                  { min: 6, message: t("common.password") },
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" label={null}>
                <Checkbox>{t("common.rememberMe")}</Checkbox>
              </Form.Item>

              <Form.Item label={null}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading && { icon: <SyncOutlined spin /> }}
                >
                  {isLoading ? t("common.loggingIn") : t("common.login")}
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form
              name="basic"
              labelCol={{ span: 8 }}
              wrapperCol={{ span: 16 }}
              style={{ maxWidth: 600 }}
              initialValues={{ remember: true }}
              onFinish={onFinishRegister}
              autoComplete="off"
              ref={formRef}
            >
              <Form.Item
                label={t("common.email")}
                name="email"
                rules={[
                  { required: true, message: t("common.placeholder") },
                  { type: "email", message: t("common.email") },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label={t("common.password")}
                name="password"
                rules={[
                  { required: true, message: t("common.placeholder") },
                  { min: 6, message: t("common.password") },
                ]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label={t("common.rePassword")}
                name="rePassword"
                rules={[
                  { required: true, message: t("common.placeholder") },
                  {
                    validator: (_, value) => {
                      if (
                        value !== formRef.current?.getFieldValue("password")
                      ) {
                        return Promise.reject(t("common.passwordMismatch"));
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item label={null}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading && { icon: <SyncOutlined spin /> }}
                >
                  {isLoading ? t("common.registering") : t("common.register")}
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
