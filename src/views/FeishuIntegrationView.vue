<template>
  <div class="feishu-page">
    <section class="feishu-header">
      <div>
        <div class="eyebrow">飞书集成</div>
        <h2>群机器人消息推送</h2>
        <p>配置飞书自定义机器人 webhook 后，可以把经验报告、作战方案和复盘卡推送到飞书群。</p>
      </div>
      <el-tag :type="status.configured && status.enabled ? 'success' : 'warning'" effect="light">
        {{ status.configured && status.enabled ? '已启用' : '待配置' }}
      </el-tag>
    </section>

    <section class="feishu-layout">
      <el-card class="config-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>机器人配置</span>
            <el-button :icon="Refresh" @click="loadStatus">刷新状态</el-button>
          </div>
        </template>

        <el-alert
          title="在飞书群中添加自定义机器人，复制 webhook；如果开启签名校验，把签名密钥也填进来。"
          type="info"
          show-icon
          :closable="false"
        />

        <el-form class="config-form" :model="configForm" label-position="top">
          <el-form-item label="Webhook 地址">
            <el-input v-model="configForm.webhookUrl" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
          </el-form-item>
          <el-form-item label="签名密钥">
            <el-input v-model="configForm.secretKey" type="password" show-password placeholder="可选，开启签名校验时填写" />
          </el-form-item>
          <div class="form-grid">
            <el-form-item label="安全关键词">
              <el-input v-model="configForm.keyword" placeholder="如：经验沉淀平台" />
            </el-form-item>
            <el-form-item label="启用状态">
              <el-switch v-model="configForm.enabled" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </div>
        </el-form>

        <div class="status-box">
          <div>
            <span>当前 webhook</span>
            <strong>{{ status.webhookMask || '未配置' }}</strong>
          </div>
          <div>
            <span>签名</span>
            <strong>{{ status.secretConfigured ? '已配置' : '未配置' }}</strong>
          </div>
          <div>
            <span>关键词</span>
            <strong>{{ status.keyword || '默认' }}</strong>
          </div>
        </div>

        <div class="config-actions">
          <el-button type="primary" :icon="Check" :loading="saving" @click="saveConfig">保存配置</el-button>
          <el-button :icon="Promotion" :loading="testing" @click="sendTest">发送测试</el-button>
        </div>
      </el-card>

      <el-card class="push-card" shadow="never">
        <template #header>
          <span>手动推送</span>
        </template>
        <el-form :model="pushForm" label-position="top">
          <div class="form-grid">
            <el-form-item label="场景">
              <el-select v-model="pushForm.scene">
                <el-option label="经验报告" value="经验报告" />
                <el-option label="项目作战室" value="项目作战室" />
                <el-option label="场景演练" value="场景演练" />
                <el-option label="风险预警" value="风险预警" />
              </el-select>
            </el-form-item>
            <el-form-item label="标题">
              <el-input v-model="pushForm.title" placeholder="请输入推送标题" />
            </el-form-item>
          </div>
          <el-form-item label="推送内容">
            <el-input v-model="pushForm.content" type="textarea" :rows="10" placeholder="填写要推送到飞书群的内容" />
          </el-form-item>
        </el-form>
        <div class="push-actions">
          <el-button :icon="DocumentCopy" @click="fillDemo">填充示例</el-button>
          <el-button type="primary" :icon="Promotion" :loading="pushing" @click="pushMessage">推送到飞书</el-button>
        </div>
      </el-card>
    </section>

    <el-card class="history-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>推送记录</span>
          <el-button :icon="Refresh" @click="loadHistory">刷新</el-button>
        </div>
      </template>
      <div class="history-list">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.content }}</p>
            <span>{{ item.scene || '经验沉淀' }} · {{ formatDate(item.createTime) }}</span>
          </div>
          <el-tag :type="item.status === 'SUCCESS' ? 'success' : 'danger'" effect="plain">{{ item.status }}</el-tag>
        </div>
      </div>
      <el-empty v-if="!historyList.length" description="暂无推送记录" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, DocumentCopy, Promotion, Refresh } from '@element-plus/icons-vue'
import {
  getFeishuHistory,
  getFeishuStatus,
  pushFeishuMessage,
  saveFeishuConfig,
  sendFeishuTest,
} from '../api/experience'

const status = ref({
  configured: false,
  enabled: false,
  webhookMask: '',
  secretConfigured: false,
  keyword: '',
})

const configForm = ref({
  webhookUrl: '',
  secretKey: '',
  keyword: '经验沉淀平台',
  enabled: true,
})

const pushForm = ref({
  scene: '经验报告',
  title: '经验沉淀平台日报',
  content: '',
})

const historyList = ref([])
const saving = ref(false)
const testing = ref(false)
const pushing = ref(false)

const loadStatus = async () => {
  const res = await getFeishuStatus()
  if (res.data.code === 200) {
    status.value = res.data.data || status.value
  }
}

const loadHistory = async () => {
  const res = await getFeishuHistory()
  if (res.data.code === 200) {
    historyList.value = res.data.data || []
  }
}

const saveConfig = async () => {
  if (!configForm.value.webhookUrl.trim()) {
    ElMessage.warning('请填写 webhook 地址')
    return
  }
  saving.value = true
  try {
    const res = await saveFeishuConfig(configForm.value)
    if (res.data.code === 200 && res.data.data) {
      ElMessage.success('飞书配置已保存')
      configForm.value.webhookUrl = ''
      configForm.value.secretKey = ''
      await loadStatus()
    } else {
      ElMessage.error('保存失败，请检查 webhook')
    }
  } finally {
    saving.value = false
  }
}

const sendTest = async () => {
  testing.value = true
  try {
    const res = await sendFeishuTest()
    handlePushResult(res.data.data, '测试消息已发送')
    await loadHistory()
  } finally {
    testing.value = false
  }
}

const pushMessage = async () => {
  if (!pushForm.value.title.trim() || !pushForm.value.content.trim()) {
    ElMessage.warning('请填写标题和推送内容')
    return
  }
  pushing.value = true
  try {
    const res = await pushFeishuMessage(pushForm.value)
    handlePushResult(res.data.data, '消息已推送到飞书')
    await loadHistory()
  } finally {
    pushing.value = false
  }
}

const handlePushResult = (result, successMessage) => {
  if (result?.success) {
    ElMessage.success(successMessage)
  } else {
    ElMessage.error(result?.message || '推送失败，请检查配置')
  }
}

const fillDemo = () => {
  pushForm.value = {
    scene: '经验报告',
    title: '高风险经验复盘提醒',
    content: '今日建议复盘：需求范围未冻结导致迭代反复返工。\n\n建议动作：\n1. 确认需求基线。\n2. 建立变更评审入口。\n3. 明确客户确认人和验收口径。',
  }
}

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadHistory()])
})
</script>

<style scoped>
.feishu-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feishu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.eyebrow {
  margin-bottom: 8px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.feishu-header h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.feishu-header p {
  margin: 10px 0 0;
  color: #6b7280;
}

.feishu-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.config-card,
.push-card,
.history-card {
  border-radius: 8px;
}

.card-header,
.config-actions,
.push-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.card-header {
  justify-content: space-between;
  font-weight: 800;
}

.config-form {
  margin-top: 18px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.status-box {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 4px 0 16px;
}

.status-box div {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.status-box span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 13px;
}

.status-box strong {
  color: #111827;
}

.config-actions,
.push-actions {
  justify-content: flex-end;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.history-item strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.history-item p {
  display: -webkit-box;
  margin: 0 0 8px;
  overflow: hidden;
  color: #4b5563;
  line-height: 1.7;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.history-item span {
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .feishu-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .feishu-header {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid,
  .status-box,
  .history-item {
    grid-template-columns: 1fr;
  }
}
</style>
