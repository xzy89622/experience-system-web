<template>
  <div class="local-ai-page">
    <section class="ai-header">
      <div>
        <div class="eyebrow">零成本本地智能</div>
        <h2>经验库 AI 助手</h2>
        <p>不调用外部付费模型，基于你的经验库做相似经验检索、风险提醒和行动建议。</p>
      </div>
      <el-tag type="success" effect="light">API 费用：0</el-tag>
    </section>

    <section class="ai-layout">
      <el-card class="question-card" shadow="never">
        <template #header>
          <span>提问</span>
        </template>
        <el-form :model="form" label-position="top">
          <div class="form-grid">
            <el-form-item label="场景">
              <el-select v-model="form.scene">
                <el-option label="经验复用问答" value="经验复用问答" />
                <el-option label="风险预警分析" value="风险预警分析" />
                <el-option label="报告生成辅助" value="报告生成辅助" />
                <el-option label="项目复盘建议" value="项目复盘建议" />
              </el-select>
            </el-form-item>
            <el-form-item label="风险等级">
              <el-select v-model="form.riskLevel" clearable placeholder="可选">
                <el-option label="低" value="低" />
                <el-option label="中" value="中" />
                <el-option label="高" value="高" />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-grid">
            <el-form-item label="项目名称">
              <el-select v-model="form.projectName" filterable clearable placeholder="可选">
                <el-option v-for="item in filterOptions.projectNames" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="问题类型">
              <el-select v-model="form.problemType" filterable clearable placeholder="可选">
                <el-option v-for="item in problemTypeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </div>

          <el-form-item label="你的问题">
            <el-input
              v-model="form.question"
              type="textarea"
              :rows="7"
              placeholder="例如：这个项目需求频繁变更导致延期，应该复用哪些经验？需要注意什么风险？"
            />
          </el-form-item>
        </el-form>

        <div class="quick-prompts">
          <button v-for="item in quickPrompts" :key="item" @click="form.question = item">{{ item }}</button>
        </div>

        <div class="question-actions">
          <el-button :icon="Refresh" @click="resetForm">重置</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="loading" @click="ask">本地智能分析</el-button>
        </div>
      </el-card>

      <div class="answer-area">
        <el-card v-if="answer" class="answer-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>分析结果</span>
              <div class="answer-tags">
                <el-tag type="success" effect="plain">{{ answer.provider }}</el-tag>
                <el-tag type="info" effect="plain">费用 {{ answer.cost }}</el-tag>
              </div>
            </div>
          </template>

          <pre class="answer-text">{{ answer.answer }}</pre>

          <div class="result-grid">
            <section>
              <span>风险提醒</span>
              <ol>
                <li v-for="item in answer.riskWarnings" :key="item">{{ item }}</li>
              </ol>
            </section>
            <section>
              <span>行动建议</span>
              <ol>
                <li v-for="item in answer.actionList" :key="item">{{ item }}</li>
              </ol>
            </section>
          </div>

          <section class="matched-section">
            <span>引用经验</span>
            <div class="matched-list">
              <div v-for="item in answer.matchedExperienceList" :key="item.id" class="matched-item">
                <strong>{{ item.title }}</strong>
                <p>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }} · {{ item.referenceValueScore || 0 }}分</p>
              </div>
            </div>
            <el-empty v-if="!answer.matchedExperienceList?.length" description="暂无匹配经验" />
          </section>
        </el-card>

        <el-empty v-else class="answer-empty" description="输入问题后生成本地智能分析" />
      </div>
    </section>

    <el-card class="history-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>最近问答</span>
          <el-button :icon="Refresh" @click="loadHistory">刷新</el-button>
        </div>
      </template>
      <div class="history-list">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <strong>{{ item.question }}</strong>
          <p>{{ item.answer }}</p>
          <span>{{ item.scene || '经验库问答' }} · {{ item.provider || 'local-rule' }} · {{ formatDate(item.createTime) }}</span>
        </div>
      </div>
      <el-empty v-if="!historyList.length" description="暂无问答记录" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, Refresh } from '@element-plus/icons-vue'
import { askLocalAi, getFilterOptions, getLocalAiHistory } from '../api/experience'

const defaultForm = () => ({
  scene: '经验复用问答',
  question: '',
  projectName: '',
  problemType: '',
  riskLevel: '',
})

const form = ref(defaultForm())
const answer = ref(null)
const loading = ref(false)
const historyList = ref([])
const filterOptions = ref({
  projectNames: [],
  problemTypes: [],
})

const quickPrompts = [
  '需求频繁变更导致项目延期，应该复用哪些经验？',
  '上线前如何提前识别高风险问题？',
  '客户沟通反复确认，怎么形成闭环？',
  '帮我生成一份项目复盘的行动建议。',
]

const problemTypeOptions = computed(() => {
  const defaults = ['需求管理', '沟通协同', '进度管理', '质量管理', '风险控制', '技术实现', '综合管理']
  return [...new Set([...(filterOptions.value.problemTypes || []), ...defaults])]
})

const loadOptions = async () => {
  const res = await getFilterOptions()
  if (res.data.code === 200) {
    filterOptions.value = {
      projectNames: res.data.data.projectNames || [],
      problemTypes: res.data.data.problemTypes || [],
    }
  }
}

const loadHistory = async () => {
  const res = await getLocalAiHistory()
  if (res.data.code === 200) {
    historyList.value = res.data.data || []
  }
}

const ask = async () => {
  if (!form.value.question.trim()) {
    ElMessage.warning('请先输入问题')
    return
  }
  loading.value = true
  try {
    const res = await askLocalAi(form.value)
    if (res.data.code === 200) {
      answer.value = res.data.data
      ElMessage.success('本地智能分析已生成')
      await loadHistory()
    } else {
      ElMessage.error(res.data.msg || '分析失败')
    }
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = defaultForm()
  answer.value = null
}

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

onMounted(async () => {
  await Promise.all([loadOptions(), loadHistory()])
})
</script>

<style scoped>
.local-ai-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ai-header {
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

.ai-header h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.ai-header p {
  margin: 10px 0 0;
  color: #6b7280;
}

.ai-layout {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.question-card,
.answer-card,
.history-card {
  border-radius: 8px;
}

.form-grid,
.result-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.quick-prompts button {
  padding: 8px 10px;
  color: #4b5563;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
}

.quick-prompts button:hover {
  color: #1677ff;
  border-color: #cfe2ff;
}

.question-actions,
.card-header,
.answer-tags {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-actions,
.card-header {
  justify-content: space-between;
}

.answer-empty {
  min-height: 620px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.answer-text {
  margin: 0 0 14px;
  padding: 18px;
  color: #303133;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  font-family: inherit;
  line-height: 1.8;
  white-space: pre-wrap;
}

.result-grid section,
.matched-section {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.matched-section {
  margin-top: 14px;
}

.result-grid span,
.matched-section > span {
  display: block;
  margin-bottom: 10px;
  color: #111827;
  font-weight: 800;
}

.result-grid ol {
  margin: 0;
  padding-left: 20px;
  color: #303133;
  line-height: 1.9;
}

.matched-list,
.history-list {
  display: grid;
  gap: 10px;
}

.matched-item,
.history-item {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.matched-item strong,
.history-item strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.matched-item p,
.history-item p {
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.history-item p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.history-item span {
  display: block;
  margin-top: 8px;
  color: #9ca3af;
  font-size: 13px;
}

@media (max-width: 1180px) {
  .ai-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .ai-header {
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid,
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
