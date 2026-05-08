<template>
  <div class="dashboard-page">
    <section class="dashboard-header">
      <div>
        <div class="eyebrow">统计看板</div>
        <h2 class="page-title">经验资产洞察</h2>
        <p class="page-desc">从风险、问题类型、复用价值和采纳热度观察组织经验沉淀质量。</p>
      </div>
      <div class="top-actions">
        <el-button :icon="Refresh" @click="loadDashboard">刷新</el-button>
        <el-button type="primary" :icon="Back" @click="goList">返回列表</el-button>
      </div>
    </section>

    <section class="kpi-grid">
      <div v-for="item in kpiCards" :key="item.label" class="kpi-card" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.hint }}</em>
      </div>
    </section>

    <section class="chart-grid">
      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>项目经验分布</span>
            <el-tag type="info" effect="plain">{{ projectStatsTable.length }} 个项目</el-tag>
          </div>
        </template>
        <v-chart class="chart" :option="projectBarOption" autoresize />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>问题类型分布</span>
            <el-tag type="warning" effect="plain">{{ problemTypeStatsTable.length }} 类问题</el-tag>
          </div>
        </template>
        <v-chart class="chart" :option="problemTypeBarOption" autoresize />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>风险等级结构</span>
            <el-tag :type="highRiskCount ? 'danger' : 'success'" effect="plain">
              高风险 {{ highRiskCount }}
            </el-tag>
          </div>
        </template>
        <v-chart class="chart" :option="riskPieOption" autoresize />
      </el-card>

      <el-card class="chart-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>创建人贡献</span>
            <el-tag type="success" effect="plain">{{ creatorStatsTable.length }} 人</el-tag>
          </div>
        </template>
        <v-chart class="chart" :option="creatorPieOption" autoresize />
      </el-card>
    </section>

    <el-card class="chart-card compare-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>热门经验对比</span>
          <el-tag type="primary" effect="plain">浏览量 / 采纳次数 / 复用价值</el-tag>
        </div>
      </template>
      <v-chart class="chart-large" :option="compareOption" autoresize />
    </el-card>

    <section class="insight-grid">
      <el-card class="insight-card" shadow="never">
        <template #header>
          <span>高价值经验 TOP10</span>
        </template>
        <div class="rank-list">
          <div v-for="(item, index) in highValueList" :key="item.id" class="rank-item">
            <span class="rank-no">{{ index + 1 }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.projectName }} · {{ item.problemType || '综合管理' }}</p>
            </div>
            <el-tag type="success" effect="plain">{{ item.referenceValueScore || 0 }}分</el-tag>
          </div>
        </div>
        <el-empty v-if="!highValueList.length" description="暂无数据" />
      </el-card>

      <el-card class="insight-card" shadow="never">
        <template #header>
          <span>高风险经验池</span>
        </template>
        <div class="rank-list">
          <div v-for="(item, index) in riskList" :key="item.id" class="rank-item risk">
            <span class="rank-no">{{ index + 1 }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.projectName }} · 浏览 {{ item.viewCount || 0 }} · 采纳 {{ item.adoptCount || 0 }}</p>
            </div>
            <el-tag type="danger" effect="plain">{{ item.riskLevel || '高' }}</el-tag>
          </div>
        </div>
        <el-empty v-if="!riskList.length" description="暂无高风险经验" />
      </el-card>
    </section>

    <section class="table-grid">
      <el-card class="table-card" shadow="never">
        <template #header>
          <span>项目经验统计表</span>
        </template>
        <el-table :data="projectStatsTable" border style="width: 100%">
          <el-table-column prop="name" label="项目名称" />
          <el-table-column prop="count" label="经验数量" width="120" />
        </el-table>
      </el-card>

      <el-card class="table-card" shadow="never">
        <template #header>
          <span>问题类型统计表</span>
        </template>
        <el-table :data="problemTypeStatsTable" border style="width: 100%">
          <el-table-column prop="name" label="问题类型" />
          <el-table-column prop="count" label="经验数量" width="120" />
        </el-table>
      </el-card>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Refresh } from '@element-plus/icons-vue'
import { getDashboardData } from '../api/experience'

import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const router = useRouter()

const dashboard = ref({
  totalExperienceCount: 0,
  totalViewCount: 0,
  totalAdoptCount: 0,
  projectCount: 0,
  averageReferenceValueScore: 0,
  highRiskExperienceCount: 0,
  adoptionRate: 0,
  projectStats: {},
  creatorStats: {},
  problemTypeStats: {},
  riskLevelStats: {},
  hotExperienceList: [],
  highValueExperienceList: [],
  riskExperienceList: [],
})

const palette = ['#1677ff', '#34c759', '#ff9f0a', '#f56c6c', '#8b5cf6', '#14b8a6']

const kpiCards = computed(() => [
  {
    label: '经验总数',
    value: dashboard.value.totalExperienceCount || 0,
    hint: '已发布经验',
    tone: 'blue',
  },
  {
    label: '总浏览量',
    value: dashboard.value.totalViewCount || 0,
    hint: '知识触达',
    tone: 'green',
  },
  {
    label: '总采纳次数',
    value: dashboard.value.totalAdoptCount || 0,
    hint: `采纳率 ${adoptionRate.value}%`,
    tone: 'orange',
  },
  {
    label: '项目数量',
    value: dashboard.value.projectCount || 0,
    hint: '覆盖项目',
    tone: 'teal',
  },
  {
    label: '平均复用价值',
    value: averageScore.value,
    hint: '满分 100',
    tone: 'purple',
  },
  {
    label: '高风险经验',
    value: highRiskCount.value,
    hint: '优先复盘',
    tone: 'red',
  },
])

const adoptionRate = computed(() => {
  if (dashboard.value.adoptionRate) {
    return dashboard.value.adoptionRate
  }
  const total = Number(dashboard.value.totalExperienceCount || 0)
  if (!total) return 0
  return Math.round((Number(dashboard.value.totalAdoptCount || 0) * 100) / total)
})

const averageScore = computed(() => {
  if (dashboard.value.averageReferenceValueScore) {
    return dashboard.value.averageReferenceValueScore
  }
  const list = dashboard.value.hotExperienceList || []
  if (!list.length) return 0
  const total = list.reduce((sum, item) => sum + Number(item.referenceValueScore || 0), 0)
  return Math.round(total / list.length)
})

const highRiskCount = computed(() => {
  if (dashboard.value.highRiskExperienceCount) {
    return dashboard.value.highRiskExperienceCount
  }
  return Number((dashboard.value.riskLevelStats || {})['高'] || 0)
})

const mapToRows = (stats, order = []) => {
  const rows = Object.keys(stats || {}).map((key) => ({
    name: key,
    count: stats[key],
  }))

  if (!order.length) {
    return rows.sort((a, b) => b.count - a.count)
  }

  return rows.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
}

const projectStatsTable = computed(() => mapToRows(dashboard.value.projectStats))
const creatorStatsTable = computed(() => mapToRows(dashboard.value.creatorStats))
const problemTypeStatsTable = computed(() => mapToRows(dashboard.value.problemTypeStats))
const riskLevelStatsTable = computed(() => mapToRows(dashboard.value.riskLevelStats, ['低', '中', '高']))

const hotList = computed(() => [...(dashboard.value.hotExperienceList || [])])
const highValueList = computed(() => {
  const list = dashboard.value.highValueExperienceList || []
  if (list.length) return [...list]
  return [...hotList.value].sort((a, b) => (b.referenceValueScore || 0) - (a.referenceValueScore || 0))
})
const riskList = computed(() => {
  const list = dashboard.value.riskExperienceList || []
  if (list.length) return [...list]
  return hotList.value.filter((item) => item.riskLevel === '高')
})

const formatAxisLabel = (value) => {
  if (!value) return ''
  const text = String(value)
  const maxLineLength = 6
  const result = []
  for (let i = 0; i < text.length; i += maxLineLength) {
    result.push(text.slice(i, i + maxLineLength))
  }
  return result.join('\n')
}

const buildBarOption = (rows, name, color) => ({
  color: [color],
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, top: 28, bottom: 86 },
  xAxis: {
    type: 'category',
    data: rows.map((item) => item.name),
    axisLabel: {
      interval: 0,
      formatter: formatAxisLabel,
      lineHeight: 18,
      margin: 16,
    },
  },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name,
      type: 'bar',
      data: rows.map((item) => item.count),
      barWidth: '42%',
      itemStyle: { borderRadius: [6, 6, 0, 0] },
    },
  ],
})

const projectBarOption = computed(() => buildBarOption(projectStatsTable.value, '经验数量', palette[0]))
const problemTypeBarOption = computed(() => buildBarOption(problemTypeStatsTable.value, '问题数量', palette[2]))

const creatorPieOption = computed(() => ({
  color: palette,
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      name: '经验数量',
      type: 'pie',
      radius: ['42%', '68%'],
      center: ['50%', '42%'],
      data: creatorStatsTable.value.map((item) => ({ name: item.name, value: item.count })),
      label: { formatter: '{b}: {c}' },
    },
  ],
}))

const riskPieOption = computed(() => ({
  color: ['#34c759', '#ff9f0a', '#f56c6c'],
  tooltip: { trigger: 'item' },
  legend: { bottom: 0 },
  series: [
    {
      name: '风险等级',
      type: 'pie',
      radius: ['36%', '68%'],
      center: ['50%', '42%'],
      data: riskLevelStatsTable.value.map((item) => ({ name: item.name, value: item.count })),
      label: { formatter: '{b}: {c}' },
    },
  ],
}))

const compareOption = computed(() => {
  const data = hotList.value.slice(0, 10)

  return {
    color: ['#1677ff', '#f56c6c', '#8b5cf6'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 50, right: 42, top: 52, bottom: 108 },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.title),
      axisLabel: {
        interval: 0,
        formatter: formatAxisLabel,
        lineHeight: 18,
        margin: 18,
      },
    },
    yAxis: [
      { type: 'value', name: '浏览/采纳', minInterval: 1 },
      { type: 'value', name: '评分', min: 0, max: 100 },
    ],
    series: [
      {
        name: '浏览量',
        type: 'bar',
        data: data.map((item) => item.viewCount || 0),
        barWidth: '34%',
        itemStyle: { borderRadius: [6, 6, 0, 0] },
      },
      {
        name: '采纳次数',
        type: 'line',
        data: data.map((item) => item.adoptCount || 0),
        smooth: true,
        symbolSize: 8,
      },
      {
        name: '复用价值',
        type: 'line',
        yAxisIndex: 1,
        data: data.map((item) => item.referenceValueScore || 0),
        smooth: true,
        symbolSize: 8,
      },
    ],
  }
})

const loadDashboard = async () => {
  try {
    const res = await getDashboardData()
    if (res.data.code === 200) {
      dashboard.value = {
        ...dashboard.value,
        ...res.data.data,
      }
    } else {
      ElMessage.error(res.data.msg || '获取统计数据失败')
    }
  } catch (error) {
    ElMessage.error('获取统计数据失败，请检查后端接口')
  }
}

const goList = () => {
  router.push('/')
}

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.eyebrow {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1677ff;
}

.page-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #111827;
}

.page-desc {
  margin: 10px 0 0;
  color: #6b7280;
}

.top-actions {
  display: flex;
  gap: 10px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.kpi-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.kpi-card span,
.kpi-card em {
  display: block;
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.kpi-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 28px;
  color: #111827;
}

.kpi-card.blue strong {
  color: #1677ff;
}

.kpi-card.green strong {
  color: #34c759;
}

.kpi-card.orange strong {
  color: #ff9f0a;
}

.kpi-card.teal strong {
  color: #14b8a6;
}

.kpi-card.purple strong {
  color: #8b5cf6;
}

.kpi-card.red strong {
  color: #f56c6c;
}

.chart-grid,
.insight-grid,
.table-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.chart-card,
.insight-card,
.table-card {
  width: 100%;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 700;
}

.chart {
  height: 380px;
  width: 100%;
}

.chart-large {
  height: 440px;
  width: 100%;
}

.rank-list {
  display: grid;
  gap: 10px;
}

.rank-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.rank-item:last-child {
  border-bottom: 0;
}

.rank-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eaf3ff;
  color: #1677ff;
  font-weight: 800;
}

.rank-item.risk .rank-no {
  background: #fff1f0;
  color: #f56c6c;
}

.rank-item strong {
  display: block;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-item p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 1320px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }

  .top-actions {
    justify-content: flex-end;
  }

  .kpi-grid,
  .chart-grid,
  .insight-grid,
  .table-grid {
    grid-template-columns: 1fr;
  }
}
</style>
