<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="logo-mark">知</div>
      <h2>{{ title }}</h2>
      <p>{{ desc }}</p>
      <el-button v-if="showRetry" type="primary" @click="goAuth">重新进入飞书免登</el-button>
      <el-button v-if="showHome" type="primary" @click="goHome">进入平台</el-button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getFeishuAuthConfig, loginByFeishuCode } from '../api/experience'

const route = useRoute()
const router = useRouter()

const title = ref('正在进行飞书免登')
const desc = ref('正在识别你的飞书身份，请稍候。')
const showRetry = ref(false)
const showHome = ref(false)
const authUrl = ref('')

const login = async () => {
  const code = route.query.code
  const token = window.localStorage.getItem('feishu_session_token')
  if (token && !code) {
    goHome()
    return
  }

  const configRes = await getFeishuAuthConfig()
  const config = configRes.data.data || {}
  authUrl.value = config.authUrl || ''

  if (!config.configured) {
    title.value = '飞书应用未配置'
    desc.value = '请先在后端配置 FEISHU_APP_ID、FEISHU_APP_SECRET 和 FEISHU_REDIRECT_URI。'
    showRetry.value = false
    return
  }

  if (!code) {
    goAuth()
    return
  }

  try {
    const res = await loginByFeishuCode(String(code))
    if (res.data.code === 200) {
      const data = res.data.data
      window.localStorage.setItem('feishu_session_token', data.token)
      window.localStorage.setItem('feishu_user', JSON.stringify(data.user || {}))
      ElMessage.success(`欢迎，${data.user?.name || '飞书用户'}`)
      goHome()
    } else {
      throw new Error(res.data.msg || '免登失败')
    }
  } catch (error) {
    title.value = '免登失败'
    desc.value = error.message || '飞书身份识别失败，请重新从飞书工作台进入。'
    showRetry.value = true
  }
}

const goAuth = () => {
  if (!authUrl.value) {
    title.value = '授权地址为空'
    desc.value = '请检查飞书免登配置。'
    return
  }
  window.location.href = authUrl.value
}

const goHome = () => {
  router.replace('/experience')
}

onMounted(() => {
  login()
})
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: #f5f7fa;
}

.auth-card {
  width: min(440px, 100%);
  padding: 36px;
  text-align: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 18px;
  color: #ffffff;
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #60a5fa 0%, #34d399 100%);
  border-radius: 14px;
}

.auth-card h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.auth-card p {
  margin: 12px 0 24px;
  color: #6b7280;
  line-height: 1.7;
}
</style>
