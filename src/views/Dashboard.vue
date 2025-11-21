<template>
  <div class="dashboard">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card class="welcome-card">
          <template #header>
            <div class="card-header">
              <span>欢迎使用 Cloudwaer 管理系统</span>
            </div>
          </template>
          <div class="welcome-content">
            <h2>页面信息</h2>
            <p>这是一个基于 Spring Cloud 的微服务架构管理系统</p>
            <el-divider />
            <el-descriptions :column="2" border>
              <el-descriptions-item label="系统名称">Cloudwaer</el-descriptions-item>
              <el-descriptions-item label="架构模式">微服务架构</el-descriptions-item>
              <el-descriptions-item label="技术栈">Spring Cloud + Vue 3</el-descriptions-item>
              <el-descriptions-item label="服务注册">Nacos</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.welcome-card {
  min-height: 400px;
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.welcome-content {
  padding: 10px 0;
}

.welcome-content h2 {
  margin: 0 0 10px 0;
  color: #409EFF;
  font-size: 24px;
}

.welcome-content p {
  margin: 10px 0;
  color: #606266;
  font-size: 16px;
}
</style>



