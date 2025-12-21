"use client";
import React, { useState } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, theme } from "antd";

const { Header, Sider, Content } = Layout;
import styles from "./view.module.scss";

// const App: React.FC = () => {

// };

// export default App;
export default function ViewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout className={styles.layout}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          // defaultSelectedKeys={["1"]}
          items={[
            {
              key: "0",
              icon: <PlusCircleOutlined />,
              label: "创建新对话",
            },
            {
              key: "1",
              // icon: <UserOutlined />,
              label: "你好我是abc",
            },
            {
              key: "2",
              // icon: <VideoCameraOutlined />,
              label: "你好蝴蝶酥胡",
            },
            {
              key: "3",
              // icon: <UploadOutlined />,
              label: "发顺丰大幅度",
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header
          style={{ padding: 0, background: colorBgContainer }}
          className={styles.header}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
          <h1 className={styles.title}>标题</h1>
        </Header>
        <Content
          style={{
            margin: "24px 16px 0px 16px",
            padding: 24,
            minHeight: 280,
            // background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
          className={styles.content}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
