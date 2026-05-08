<template>
  <div class="drill-page">
    <section class="drill-header">
      <div>
        <div class="eyebrow">场景演练</div>
        <h2>经验复用闯关</h2>
        <p>从真实经验库抽取项目场景，判断风险、选择处置动作，系统即时评分并生成复盘卡。</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="loadExperienceList">刷新场景</el-button>
        <el-button type="primary" :icon="MagicStick" @click="randomScenario">随机抽题</el-button>
      </div>
    </section>

    <section class="drill-metrics">
      <div v-for="item in metrics" :key="item.label" class="metric-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.hint }}</em>
      </div>
    </section>

    <section class="drill-layout">
      <el-card class="scenario-list-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>选择场景</span>
            <el-select v-model="riskFilter" size="small" clearable placeholder="风险">
              <el-option label="高" value="高" />
              <el-option label="中" value="中" />
              <el-option label="低" value="低" />
            </el-select>
          </div>
        </template>

        <div class="scenario-list">
          <button
            v-for="item in filteredScenarios"
            :key="item.id"
            class="scenario-card"
            :class="{ active: selectedExperience?.id === item.id }"
            @click="selectScenario(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }}</span>
            <div>
              <el-tag :type="riskType(item.riskLevel)" size="small" effect="plain">{{ item.riskLevel || '低' }}风险</el-tag>
              <el-tag size="small" effect="plain">{{ item.referenceValueScore || 0 }}分</el-tag>
            </div>
          </button>
        </div>
        <el-empty v-if="!filteredScenarios.length" description="暂无可演练场景" />
      </el-card>

      <section v-if="selectedExperience" class="drill-workbench">
        <div class="case-panel">
          <div class="case-heading">
            <div>
              <span>当前案例</span>
              <h3>{{ selectedExperience.title }}</h3>
              <p>{{ selectedExperience.projectName || '未填写项目' }} · {{ selectedExperience.problemType || '综合管理' }}</p>
            </div>
            <el-tag :type="riskType(selectedExperience.riskLevel)" effect="light">{{ selectedExperience.riskLevel || '低' }}风险</el-tag>
          </div>

          <div class="case-story">
            <span>场景描述</span>
            <p>{{ selectedExperience.sceneDesc || selectedExperience.problemDesc || '暂无场景描述' }}</p>
          </div>

          <div class="drill-step">
            <div class="step-title">
              <span>1</span>
              <strong>先判断风险等级</strong>
            </div>
            <el-radio-group v-model="riskAnswer">
              <el-radio-button label="低">低风险</el-radio-button>
              <el-radio-button label="中">中风险</el-radio-button>
              <el-radio-button label="高">高风险</el-radio-button>
            </el-radio-group>
          </div>

          <div class="drill-step">
            <div class="step-title">
              <span>2</span>
              <strong>选择你会采取的处置动作</strong>
            </div>
            <div class="action-grid">
              <button
                v-for="item in actionOptions"
                :key="item.key"
                class="action-option"
                :class="{ selected: selectedActions.includes(item.key), bad: item.bad }"
                @click="toggleAction(item.key)"
              >
                <strong>{{ item.label }}</strong>
                <p>{{ item.desc }}</p>
              </button>
            </div>
          </div>

          <div class="drill-step">
            <div class="step-title">
              <span>3</span>
              <strong>给自己的把握程度打分</strong>
            </div>
            <el-slider v-model="confidence" :min="0" :max="100" :step="5" show-input />
          </div>

          <div class="case-actions">
            <el-button :icon="View" @click="hintVisible = !hintVisible">{{ hintVisible ? '收起提示' : '查看提示' }}</el-button>
            <el-button type="primary" :icon="Check" @click="submitDrill">提交演练</el-button>
          </div>

          <div v-if="hintVisible" class="hint-box">
            <strong>历史经验提示</strong>
            <p>{{ selectedExperience.solution || selectedExperience.summary || '暂无解决方案，可先补充经验内容。' }}</p>
          </div>
        </div>

        <aside class="result-panel">
          <div class="score-card">
            <el-progress type="dashboard" :width="136" :percentage="scoreResult.score" :status="scoreStatus" />
            <strong>{{ scoreResult.level }}</strong>
            <span>{{ scoreResult.summary }}</span>
          </div>

          <div class="feedback-list">
            <div v-for="item in scoreResult.feedback" :key="item" class="feedback-item">
              {{ item }}
            </div>
          </div>

          <div class="review-card">
            <div class="card-header">
              <span>复盘卡</span>
              <el-button link :icon="DocumentCopy" @click="copyReviewCard">复制</el-button>
            </div>
            <pre>{{ reviewCardText }}</pre>
          </div>
        </aside>
      </section>

      <el-empty v-else class="workbench-empty" description="请选择一个场景开始演练" />
    </section>

    <el-card class="history-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>演练记录</span>
          <el-button :icon="Delete" @click="clearHistory">清空记录</el-button>
        </div>
      </template>
      <div class="history-list">
        <div v-for="item in drillHistory" :key="item.time" class="history-item">
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.projectName }} · {{ item.riskAnswer }}风险判断 · {{ item.score }}分</p>
          </div>
          <span>{{ item.time }}</span>
        </div>
      </div>
      <el-empty v-if="!drillHistory.length" description="暂无演练记录" />
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Delete, DocumentCopy, MagicStick, Refresh, View } from '@element-plus/icons-vue'
import { getExperienceList } from '../api/experience'

const STORAGE_KEY = 'experience_drill_history'

const experienceList = ref([])
const selectedExperience = ref(null)
const riskFilter = ref('')
const riskAnswer = ref('')
const selectedActions = ref([])
const confidence = ref(60)
const hintVisible = ref(false)
const drillHistory = ref(readStorage(STORAGE_KEY, []))
const lastSubmitted = ref(false)

const filteredScenarios = computed(() => {
  return experienceList.value
    .filter((item) => !riskFilter.value || item.riskLevel === riskFilter.value)
    .sort((a, b) => Number(b.referenceValueScore || 0) - Number(a.referenceValueScore || 0))
})

const metrics = computed(() => {
  const bestScore = drillHistory.value.length ? Math.max(...drillHistory.value.map((item) => Number(item.score || 0))) : 0
  return [
    { label: '可演练场景', value: experienceList.value.length, hint: '来自经验库' },
    { label: '已完成演练', value: drillHistory.value.length, hint: '本地记录' },
    { label: '历史最高分', value: bestScore, hint: '满分 100' },
    { label: '当前把握', value: `${confidence.value}%`, hint: '自评信心' },
  ]
})

const actionOptions = computed(() => {
  const item = selectedExperience.value || {}
  const problemType = item.problemType || ''
  const options = [
    {
      key: 'impact',
      label: '确认影响范围',
      desc: '明确影响的业务、人员、时间和交付物。',
      weight: 14,
    },
    {
      key: 'owner',
      label: '锁定责任人',
      desc: '给每项动作指定负责人和截止时间。',
      weight: 12,
    },
    {
      key: 'record',
      label: '形成书面记录',
      desc: '用纪要、清单或台账固化结论。',
      weight: 12,
    },
    {
      key: 'review',
      label: '设置复盘检查点',
      desc: '在关键节点检查风险是否关闭。',
      weight: 12,
    },
    {
      key: 'shortcut',
      label: '先推进，后补确认',
      desc: '为了赶进度，先口头同步再处理文档。',
      weight: -16,
      bad: true,
    },
  ]

  if (problemType.includes('需求')) {
    options.splice(1, 0, {
      key: 'baseline',
      label: '冻结需求基线',
      desc: '明确变更入口、评审方式和客户确认人。',
      weight: 18,
    })
  }
  if (problemType.includes('技术')) {
    options.splice(1, 0, {
      key: 'rollback',
      label: '准备回滚预案',
      desc: '提前定义验证、监控、回退和补偿策略。',
      weight: 18,
    })
  }
  if (problemType.includes('质量')) {
    options.splice(1, 0, {
      key: 'test-matrix',
      label: '补齐测试矩阵',
      desc: '覆盖异常、边界、权限和数据状态组合。',
      weight: 18,
    })
  }
  if (problemType.includes('沟通')) {
    options.splice(1, 0, {
      key: 'minutes',
      label: '输出会议纪要',
      desc: '明确事项、责任人、截止时间和确认人。',
      weight: 18,
    })
  }
  return options
})

const scoreResult = computed(() => {
  if (!selectedExperience.value) {
    return { score: 0, level: '未开始', summary: '请选择场景', feedback: [] }
  }

  let score = 20
  const feedback = []
  const realRisk = selectedExperience.value.riskLevel || '低'
  if (riskAnswer.value === realRisk) {
    score += 25
    feedback.push('风险等级判断准确。')
  } else if (riskAnswer.value) {
    score += 8
    feedback.push(`风险判断有偏差，历史经验标记为${realRisk}风险。`)
  } else {
    feedback.push('还没有完成风险等级判断。')
  }

  actionOptions.value.forEach((option) => {
    if (selectedActions.value.includes(option.key)) {
      score += option.weight
      if (option.bad) {
        feedback.push(`“${option.label}”容易造成后续返工，建议避免。`)
      }
    }
  })

  if (selectedActions.value.length >= 3) {
    score += 8
    feedback.push('处置动作覆盖较完整。')
  } else {
    feedback.push('处置动作偏少，建议至少覆盖影响、责任、记录和复盘。')
  }

  score += Math.round(confidence.value / 10)
  score = Math.max(0, Math.min(100, score))

  const level = score >= 85 ? '优秀' : score >= 70 ? '可落地' : score >= 55 ? '需补强' : '风险较高'
  const summary = score >= 85
    ? '你的处置策略比较成熟，可以转成项目检查清单。'
    : score >= 70
      ? '整体方向可用，建议补齐责任和验证标准。'
      : '建议先查看历史经验提示，再重新选择动作。'

  return { score, level, summary, feedback }
})

const scoreStatus = computed(() => {
  if (scoreResult.value.score >= 85) return 'success'
  if (scoreResult.value.score >= 70) return ''
  if (scoreResult.value.score >= 55) return 'warning'
  return 'exception'
})

const reviewCardText = computed(() => {
  if (!selectedExperience.value) return '暂无复盘卡'
  const actions = selectedActions.value
    .map((key) => actionOptions.value.find((item) => item.key === key)?.label)
    .filter(Boolean)
    .join('、') || '暂无选择'
  return [
    `# 场景演练复盘卡`,
    `案例：${selectedExperience.value.title}`,
    `项目：${selectedExperience.value.projectName || '未填写项目'}`,
    `问题类型：${selectedExperience.value.problemType || '综合管理'}`,
    `风险判断：${riskAnswer.value || '未判断'}（历史标记：${selectedExperience.value.riskLevel || '低'}）`,
    `演练得分：${scoreResult.value.score}`,
    `选择动作：${actions}`,
    `经验提示：${selectedExperience.value.solution || selectedExperience.value.summary || '暂无'}`,
  ].join('\n')
})

const loadExperienceList = async () => {
  const res = await getExperienceList({})
  if (res.data.code === 200) {
    experienceList.value = res.data.data || []
    if (!selectedExperience.value && experienceList.value.length) {
      selectScenario(experienceList.value[0])
    }
  }
}

const selectScenario = (item) => {
  selectedExperience.value = item
  riskAnswer.value = ''
  selectedActions.value = []
  confidence.value = 60
  hintVisible.value = false
  lastSubmitted.value = false
}

const randomScenario = () => {
  if (!filteredScenarios.value.length) {
    ElMessage.warning('暂无可抽取场景')
    return
  }
  const index = Math.floor(Math.random() * filteredScenarios.value.length)
  selectScenario(filteredScenarios.value[index])
  ElMessage.success('已抽取新场景')
}

const toggleAction = (key) => {
  if (selectedActions.value.includes(key)) {
    selectedActions.value = selectedActions.value.filter((item) => item !== key)
  } else {
    selectedActions.value = [...selectedActions.value, key]
  }
  lastSubmitted.value = false
}

const submitDrill = () => {
  if (!riskAnswer.value) {
    ElMessage.warning('请先判断风险等级')
    return
  }
  if (!selectedActions.value.length) {
    ElMessage.warning('请选择至少一个处置动作')
    return
  }

  const record = {
    title: selectedExperience.value.title,
    projectName: selectedExperience.value.projectName || '未填写项目',
    riskAnswer: riskAnswer.value,
    score: scoreResult.value.score,
    time: new Date().toLocaleString('zh-CN'),
  }
  drillHistory.value = [record, ...drillHistory.value].slice(0, 20)
  writeStorage(STORAGE_KEY, drillHistory.value)
  lastSubmitted.value = true
  ElMessage.success(`演练完成，得分 ${scoreResult.value.score}`)
}

const copyReviewCard = async () => {
  try {
    await navigator.clipboard.writeText(reviewCardText.value)
    ElMessage.success('复盘卡已复制')
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制')
  }
}

const clearHistory = async () => {
  if (!drillHistory.value.length) return
  await ElMessageBox.confirm('确认清空所有演练记录？', '清空确认', { type: 'warning' })
  drillHistory.value = []
  writeStorage(STORAGE_KEY, [])
}

const riskType = (risk) => {
  if (risk === '高') return 'danger'
  if (risk === '中') return 'warning'
  return 'success'
}

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

function writeStorage(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

onMounted(() => {
  loadExperienceList()
})
</script>

<style scoped>
.drill-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.drill-header {
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

.drill-header h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.drill-header p {
  margin: 10px 0 0;
  color: #6b7280;
}

.header-actions,
.card-header,
.case-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.drill-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.metric-card span,
.metric-card em {
  display: block;
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #111827;
  font-size: 28px;
}

.drill-layout {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.scenario-list-card,
.history-card {
  border-radius: 8px;
}

.card-header {
  justify-content: space-between;
  font-weight: 800;
}

.scenario-list {
  display: grid;
  gap: 10px;
  max-height: 720px;
  overflow: auto;
}

.scenario-card {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.scenario-card:hover,
.scenario-card.active {
  border-color: #1677ff;
  background: #f3f8ff;
}

.scenario-card strong {
  color: #111827;
  line-height: 1.45;
}

.scenario-card span {
  color: #6b7280;
  font-size: 13px;
}

.scenario-card div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.drill-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: start;
}

.case-panel,
.result-panel,
.workbench-empty {
  min-height: 720px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.case-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.case-heading span,
.case-story span {
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.case-heading h3 {
  margin: 8px 0;
  color: #111827;
  font-size: 23px;
}

.case-heading p,
.case-story p {
  margin: 0;
  color: #4b5563;
  line-height: 1.7;
}

.case-story,
.drill-step,
.hint-box {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.step-title span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #1677ff;
  font-weight: 800;
  background: #eaf3ff;
  border-radius: 8px;
}

.step-title strong {
  color: #111827;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.action-option {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
}

.action-option.selected {
  background: #eaf3ff;
  border-color: #1677ff;
}

.action-option.bad.selected {
  background: #fff1f0;
  border-color: #f56c6c;
}

.action-option strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.action-option p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.case-actions {
  justify-content: flex-end;
  margin-top: 14px;
}

.hint-box {
  background: #fff8f0;
  border-color: #fde2c4;
}

.hint-box strong {
  display: block;
  margin-bottom: 8px;
  color: #111827;
}

.score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.score-card strong {
  color: #111827;
  font-size: 22px;
}

.score-card span {
  color: #6b7280;
  text-align: center;
  line-height: 1.6;
}

.feedback-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.feedback-item {
  padding: 12px;
  color: #303133;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  line-height: 1.6;
}

.review-card {
  margin-top: 14px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.review-card pre {
  max-height: 260px;
  margin: 12px 0 0;
  overflow: auto;
  color: #303133;
  font-family: inherit;
  line-height: 1.8;
  white-space: pre-wrap;
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

.history-item p,
.history-item span {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .drill-layout,
  .drill-workbench {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .drill-header,
  .case-heading,
  .history-item {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .drill-metrics,
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
