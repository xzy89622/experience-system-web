<template>
  <div class="playbook-page">
    <section class="playbook-header">
      <div>
        <div class="eyebrow">项目复用作战室</div>
        <h2>一键生成项目复用方案</h2>
        <p>输入项目画像，自动匹配历史经验，生成风险预警、复用检查清单和会议议程。</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="loadHistory">刷新历史</el-button>
        <el-button type="primary" :icon="MagicStick" :loading="generating" @click="generatePlaybook">生成方案</el-button>
      </div>
    </section>

    <section class="playbook-layout">
      <el-card class="form-card" shadow="never">
        <template #header>
          <span>项目画像</span>
        </template>

        <el-form :model="form" label-position="top">
          <el-form-item label="项目名称">
            <el-select v-model="form.projectName" filterable allow-create default-first-option placeholder="选择或输入项目名称">
              <el-option v-for="item in filterOptions.projectNames" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="行业领域">
              <el-input v-model="form.industry" placeholder="如：政务、金融、制造" />
            </el-form-item>
            <el-form-item label="项目类型">
              <el-input v-model="form.projectType" placeholder="如：实施、开发、咨询" />
            </el-form-item>
          </div>

          <div class="form-grid">
            <el-form-item label="问题类型">
              <el-select v-model="form.problemType" clearable filterable placeholder="选择问题类型">
                <el-option v-for="item in problemTypeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="风险等级">
              <el-select v-model="form.riskLevel" clearable placeholder="选择风险等级">
                <el-option label="低" value="低" />
                <el-option label="中" value="中" />
                <el-option label="高" value="高" />
              </el-select>
            </el-form-item>
          </div>

          <div class="form-grid">
            <el-form-item label="目标阶段">
              <el-select v-model="form.targetStage" placeholder="选择阶段">
                <el-option v-for="item in stageOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="负责人">
              <el-input v-model="form.ownerName" placeholder="默认项目负责人" />
            </el-form-item>
          </div>

          <el-form-item label="当前场景">
            <el-input
              v-model="form.scenarioDesc"
              type="textarea"
              :rows="6"
              placeholder="描述项目当前背景、风险迹象、客户诉求、交付压力或需要复用的经验方向"
            />
          </el-form-item>
        </el-form>

        <div class="form-actions">
          <el-button :icon="Refresh" @click="resetForm">重置</el-button>
          <el-button type="primary" :icon="MagicStick" :loading="generating" @click="generatePlaybook">生成作战方案</el-button>
        </div>
      </el-card>

      <div class="result-area">
        <section v-if="playbook" class="playbook-result">
          <div class="result-hero">
            <div>
              <span>生成结果</span>
              <h3>{{ playbook.projectName }} · {{ playbook.targetStage }}</h3>
              <p>{{ playbook.reuseBrief }}</p>
            </div>
            <div class="maturity-box">
              <el-progress type="dashboard" :width="116" :percentage="playbook.maturityScore || 0" />
              <strong>复用成熟度</strong>
            </div>
          </div>

          <div class="tag-row">
            <el-tag type="primary" effect="plain">{{ playbook.problemType }}</el-tag>
            <el-tag :type="playbook.riskLevel === '高' ? 'danger' : playbook.riskLevel === '中' ? 'warning' : 'success'" effect="plain">
              {{ playbook.riskLevel }}风险
            </el-tag>
            <el-tag v-for="item in playbook.coverageTags" :key="item" effect="plain">{{ item }}</el-tag>
          </div>

          <div class="result-grid">
            <section class="result-panel warning">
              <span>风险预警</span>
              <ul>
                <li v-for="item in playbook.riskWarnings" :key="item">{{ item }}</li>
              </ul>
            </section>
            <section class="result-panel">
              <span>复用检查清单</span>
              <ol>
                <li v-for="item in playbook.checklist" :key="item">{{ item }}</li>
              </ol>
            </section>
            <section class="result-panel">
              <span>会议议程</span>
              <ol>
                <li v-for="item in playbook.meetingAgenda" :key="item">{{ item }}</li>
              </ol>
            </section>
            <section class="result-panel">
              <span>推荐经验</span>
              <div class="recommend-list">
                <div v-for="item in playbook.recommendExperienceList" :key="item.id" class="recommend-card">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }} · {{ item.referenceValueScore || 0 }}分</p>
                </div>
              </div>
              <el-empty v-if="!playbook.recommendExperienceList?.length" description="暂无匹配经验" />
            </section>
          </div>

          <div class="result-actions">
            <el-button :icon="DocumentCopy" @click="copyPlaybook">复制方案</el-button>
            <el-button type="success" :icon="Check" :loading="saving" @click="saveCurrentPlaybook">保存到数据库</el-button>
          </div>
        </section>

        <el-empty v-else class="result-empty" description="填写项目画像后生成复用作战方案" />
      </div>
    </section>

    <el-card class="history-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>历史作战方案</span>
          <el-tag type="info" effect="plain">{{ historyList.length }} 条</el-tag>
        </div>
      </template>
      <div class="history-list">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div>
            <strong>{{ item.projectName }} · {{ item.targetStage || '未填写阶段' }}</strong>
            <p>{{ item.reuseBrief || '暂无简报' }}</p>
            <div class="history-meta">
              <span>{{ item.problemType || '综合管理' }}</span>
              <span>{{ item.riskLevel || '低' }}风险</span>
              <span>{{ formatDate(item.createTime) }}</span>
            </div>
          </div>
          <div class="history-actions">
            <el-tag type="primary" effect="plain">{{ item.maturityScore || 0 }}分</el-tag>
            <el-button link type="danger" :icon="Delete" @click="removeHistory(item)">删除</el-button>
          </div>
        </div>
      </div>
      <el-empty v-if="!historyList.length" description="暂无保存的作战方案" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Delete, DocumentCopy, MagicStick, Refresh } from '@element-plus/icons-vue'
import {
  deleteProjectPlaybook,
  generateProjectPlaybook,
  getFilterOptions,
  getProjectPlaybookList,
  saveProjectPlaybook,
} from '../api/experience'

const defaultForm = () => ({
  projectName: '',
  industry: '',
  projectType: '',
  problemType: '',
  riskLevel: '',
  targetStage: '项目启动',
  scenarioDesc: '',
  ownerName: '',
})

const form = ref(defaultForm())
const playbook = ref(null)
const historyList = ref([])
const generating = ref(false)
const saving = ref(false)
const filterOptions = ref({
  projectNames: [],
  problemTypes: [],
})

const stageOptions = ['项目启动', '需求调研', '方案设计', '开发联调', '上线发布', '验收交付', '项目复盘']

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
  const res = await getProjectPlaybookList()
  if (res.data.code === 200) {
    historyList.value = res.data.data || []
  }
}

const generatePlaybook = async () => {
  if (!form.value.projectName.trim()) {
    ElMessage.warning('请先填写项目名称')
    return
  }
  generating.value = true
  try {
    const res = await generateProjectPlaybook(form.value)
    if (res.data.code === 200) {
      playbook.value = res.data.data
      ElMessage.success('作战方案已生成')
    } else {
      ElMessage.error(res.data.msg || '生成失败')
    }
  } finally {
    generating.value = false
  }
}

const saveCurrentPlaybook = async () => {
  if (!playbook.value) return
  saving.value = true
  try {
    const res = await saveProjectPlaybook(playbook.value)
    if (res.data.code === 200 && res.data.data) {
      ElMessage.success('作战方案已保存')
      await loadHistory()
    } else {
      ElMessage.error('保存失败，请稍后重试')
    }
  } finally {
    saving.value = false
  }
}

const removeHistory = async (item) => {
  await ElMessageBox.confirm(`确认删除“${item.projectName}”的作战方案？`, '删除确认', {
    type: 'warning',
  })
  const res = await deleteProjectPlaybook(item.id)
  if (res.data.code === 200 && res.data.data) {
    ElMessage.success('已删除')
    await loadHistory()
  }
}

const resetForm = () => {
  form.value = defaultForm()
  playbook.value = null
}

const copyPlaybook = async () => {
  if (!playbook.value) return
  const text = [
    `# ${playbook.value.projectName} 项目复用作战方案`,
    '',
    playbook.value.reuseBrief,
    '',
    '## 风险预警',
    ...(playbook.value.riskWarnings || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    '## 复用检查清单',
    ...(playbook.value.checklist || []).map((item, index) => `${index + 1}. ${item}`),
    '',
    '## 会议议程',
    ...(playbook.value.meetingAgenda || []).map((item, index) => `${index + 1}. ${item}`),
  ].join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('作战方案已复制')
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制')
  }
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
.playbook-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.playbook-header {
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

.playbook-header h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.playbook-header p {
  margin: 10px 0 0;
  color: #6b7280;
}

.header-actions,
.card-header,
.form-actions,
.result-actions,
.history-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.playbook-layout {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.form-card,
.history-card {
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-actions {
  justify-content: flex-end;
  padding-top: 8px;
}

.result-area {
  min-height: 620px;
}

.playbook-result {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.result-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 20px;
  padding: 22px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.result-hero span {
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.result-hero h3 {
  margin: 8px 0;
  color: #111827;
  font-size: 24px;
}

.result-hero p {
  margin: 0;
  color: #4b5563;
  line-height: 1.8;
}

.maturity-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
}

.maturity-box strong {
  margin-top: -6px;
  color: #4b5563;
  font-size: 13px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.result-panel {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.result-panel.warning {
  background: #fff8f0;
  border-color: #fde2c4;
}

.result-panel span {
  display: block;
  margin-bottom: 10px;
  color: #111827;
  font-weight: 800;
}

.result-panel ul,
.result-panel ol {
  margin: 0;
  padding-left: 20px;
  color: #303133;
  line-height: 1.9;
}

.recommend-list {
  display: grid;
  gap: 10px;
}

.recommend-card {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.recommend-card strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.recommend-card p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.result-actions {
  justify-content: flex-end;
  margin-top: 16px;
}

.result-empty {
  min-height: 620px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.card-header {
  justify-content: space-between;
  font-weight: 800;
}

.history-list {
  display: grid;
  gap: 12px;
}

.history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
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
  margin: 0 0 8px;
  color: #4b5563;
  line-height: 1.7;
}

.history-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #6b7280;
  font-size: 13px;
}

.history-actions {
  justify-content: flex-end;
}

@media (max-width: 1180px) {
  .playbook-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .playbook-header,
  .history-item {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .form-grid,
  .result-hero,
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
