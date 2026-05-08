<template>
  <div class="feature-page">
    <section class="feature-header">
      <div>
        <div class="eyebrow">{{ config.group }}</div>
        <h2>{{ config.title }}</h2>
        <p>{{ config.desc }}</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" @click="loadData">刷新</el-button>
        <el-button v-if="config.primaryAction" type="primary" :icon="config.primaryIcon" @click="handlePrimaryAction">
          {{ config.primaryAction }}
        </el-button>
      </div>
    </section>

    <section class="stat-grid">
      <div v-for="item in stats" :key="item.label" class="stat-card" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.hint }}</em>
      </div>
    </section>

    <section v-if="featureKey === 'favorites'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>我的收藏夹</span>
            <el-tag type="warning" effect="plain">{{ favoriteList.length }} 条</el-tag>
          </div>
        </template>
        <el-table :data="favoriteList" border style="width: 100%">
          <el-table-column prop="title" label="经验标题" min-width="240" />
          <el-table-column prop="projectName" label="项目" min-width="180" />
          <el-table-column prop="problemType" label="问题类型" width="130" />
          <el-table-column prop="riskLevel" label="风险" width="90" />
          <el-table-column label="评分" width="90">
            <template #default="{ row }">{{ row.referenceValueScore || 0 }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!favoriteList.length" description="暂无收藏经验" />
      </el-card>
    </section>

    <section v-else-if="featureKey === 'reuse-tasks'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>复用任务看板</span>
            <el-button type="primary" :icon="Plus" @click="taskDialogVisible = true">新增任务</el-button>
          </div>
        </template>
        <div class="kanban">
          <div v-for="column in taskColumns" :key="column.value" class="kanban-column">
            <div class="kanban-title">
              <span>{{ column.label }}</span>
              <el-tag effect="plain">{{ tasksByStatus(column.value).length }}</el-tag>
            </div>
            <div class="task-list">
              <div v-for="task in tasksByStatus(column.value)" :key="task.id" class="task-card">
                <strong>{{ task.title }}</strong>
                <p>{{ task.remark || '暂无备注' }}</p>
                <div class="task-meta">
                  <span>{{ task.assignee || '未分配' }}</span>
                  <span>{{ task.dueDate || '无截止日期' }}</span>
                </div>
                <div class="task-actions">
                  <el-button v-if="task.status !== 'TODO'" link @click="updateTaskStatus(task, 'TODO')">待办</el-button>
                  <el-button v-if="task.status !== 'DOING'" link @click="updateTaskStatus(task, 'DOING')">进行中</el-button>
                  <el-button v-if="task.status !== 'DONE'" link type="success" @click="updateTaskStatus(task, 'DONE')">完成</el-button>
                  <el-button link type="danger" @click="deleteTask(task)">删除</el-button>
                </div>
              </div>
              <el-empty v-if="!tasksByStatus(column.value).length" description="暂无任务" />
            </div>
          </div>
        </div>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'risk-warning'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>风险预警池</span>
            <el-tag type="danger" effect="plain">{{ riskList.length }} 条</el-tag>
          </div>
        </template>
        <div class="rank-list">
          <div v-for="item in riskList" :key="item.id" class="rank-item">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.projectName }} · {{ item.problemType || '综合管理' }} · {{ item.riskLevel || '高' }}风险</p>
            </div>
            <el-progress :percentage="normalizeScore(item.referenceValueScore)" :stroke-width="8" />
          </div>
        </div>
        <el-empty v-if="!riskList.length" description="暂无风险经验" />
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>预警处理建议</span>
        </template>
        <ol class="suggestion-list">
          <li>高风险经验优先组织复盘，明确问题触发条件和预警指标。</li>
          <li>将解决方案拆成检查项，挂到同类项目启动、评审、上线节点。</li>
          <li>对浏览高但采纳低的经验，补充可执行步骤和适用边界。</li>
          <li>对风险等级高且内容不完整的经验，优先补齐原因分析与复用场景。</li>
        </ol>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'recommendations'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>智能推荐清单</span>
            <el-tag type="success" effect="plain">{{ recommendationList.length }} 条</el-tag>
          </div>
        </template>
        <div class="rank-list">
          <div v-for="item in recommendationList" :key="item.id" class="rank-item">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }} · 浏览 {{ item.viewCount || 0 }} · 采纳 {{ item.adoptCount || 0 }}</p>
              <div class="tag-cloud">
                <el-tag v-for="tagItem in splitTags(item.tags).slice(0, 4)" :key="tagItem" size="small" effect="plain">{{ tagItem }}</el-tag>
              </div>
            </div>
            <div class="score-pill">{{ recommendScore(item) }} 分</div>
          </div>
        </div>
        <el-empty v-if="!recommendationList.length" description="暂无推荐经验" />
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>推荐逻辑</span>
        </template>
        <ol class="suggestion-list">
          <li>优先推荐复用价值高、浏览采纳表现好的经验。</li>
          <li>高风险经验会被适当提前，便于项目启动前复盘避坑。</li>
          <li>内容越完整的经验越适合直接复用，会得到更高排序。</li>
          <li>没有标签或复用场景的经验会进入待完善治理清单。</li>
        </ol>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'adoption-tracking'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>采纳跟踪</span>
            <el-tag type="success" effect="plain">转化率 {{ totalAdoptionRate }}%</el-tag>
          </div>
        </template>
        <el-table :data="adoptionRows" border style="width: 100%">
          <el-table-column prop="title" label="经验标题" min-width="240" />
          <el-table-column prop="projectName" label="项目" min-width="150" />
          <el-table-column prop="viewCountValue" label="浏览" width="90" />
          <el-table-column prop="adoptCountValue" label="采纳" width="90" />
          <el-table-column label="转化" width="180">
            <template #default="{ row }">
              <el-progress :percentage="row.adoptionRate" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column prop="suggestion" label="跟进建议" min-width="240" />
        </el-table>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'project-lens'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>项目经验视角</span>
        </template>
        <el-table :data="projectLensRows" border style="width: 100%">
          <el-table-column prop="projectName" label="项目" min-width="170" />
          <el-table-column prop="count" label="经验" width="80" />
          <el-table-column prop="highRiskCount" label="高风险" width="90" />
          <el-table-column prop="avgScore" label="均分" width="80" />
          <el-table-column prop="problemTypes" label="问题覆盖" min-width="220" />
        </el-table>
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>项目治理建议</span>
        </template>
        <div class="timeline-list">
          <div v-for="item in projectLensRows.slice(0, 6)" :key="item.projectName" class="timeline-item">
            <strong>{{ item.projectName }}</strong>
            <span>{{ item.suggestion }}</span>
          </div>
        </div>
        <el-empty v-if="!projectLensRows.length" description="暂无项目数据" />
      </el-card>
    </section>

    <section v-else-if="featureKey === 'tag-governance'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>标签治理清单</span>
        </template>
        <el-table :data="tagGovernanceRows" border style="width: 100%">
          <el-table-column prop="title" label="经验标题" min-width="220" />
          <el-table-column prop="tagsText" label="当前标签" min-width="180" />
          <el-table-column prop="status" label="状态" width="110" />
          <el-table-column prop="action" label="建议动作" min-width="220" />
        </el-table>
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>标签规范建议</span>
        </template>
        <div class="tag-cloud large">
          <el-tag v-for="item in tagCloud.slice(0, 24)" :key="item.name" :type="item.count > 1 ? 'primary' : 'info'" effect="plain" size="large">
            {{ item.name }} · {{ item.count }}
          </el-tag>
        </div>
        <ol class="suggestion-list">
          <li>优先补齐没有标签的经验，保证检索和推荐可用。</li>
          <li>同义标签尽量合并，例如“上线发布”和“系统上线”。</li>
          <li>每条经验保留 2 到 5 个标签，避免过少或过散。</li>
        </ol>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'improvement'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>待完善经验</span>
            <el-tag type="warning" effect="plain">{{ incompleteList.length }} 条</el-tag>
          </div>
        </template>
        <el-table :data="incompleteList" border style="width: 100%">
          <el-table-column prop="title" label="经验标题" min-width="240" />
          <el-table-column label="完整度" width="180">
            <template #default="{ row }">
              <el-progress :percentage="completionPercent(row)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column label="缺失内容" min-width="260">
            <template #default="{ row }">{{ missingFields(row).join('、') || '无' }}</template>
          </el-table-column>
          <el-table-column prop="updaterName" label="最后修改人" width="130" />
        </el-table>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'templates'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>模板中心</span>
            <el-tag type="primary" effect="plain">{{ templates.length }} 个模板</el-tag>
          </div>
        </template>
        <div class="template-grid">
          <div v-for="item in templates" :key="item.name" class="template-card">
            <strong>{{ item.name }}</strong>
            <p>{{ item.desc }}</p>
            <div class="tag-cloud">
              <el-tag v-for="tagItem in item.tags" :key="tagItem" size="small" effect="plain">{{ tagItem }}</el-tag>
            </div>
            <el-button :icon="DocumentCopy" @click="copyText(item.content, '模板已复制')">复制模板</el-button>
          </div>
        </div>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'knowledge-map'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>标签热力</span>
        </template>
        <div class="tag-cloud large">
          <el-tag
            v-for="item in tagCloud"
            :key="item.name"
            :type="item.count > 1 ? 'primary' : 'info'"
            effect="plain"
            size="large"
          >
            {{ item.name }} · {{ item.count }}
          </el-tag>
        </div>
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>项目 - 问题类型矩阵</span>
        </template>
        <el-table :data="matrixRows" border style="width: 100%">
          <el-table-column prop="projectName" label="项目" min-width="180" />
          <el-table-column prop="problemTypes" label="问题类型" min-width="260" />
          <el-table-column prop="count" label="经验数" width="100" />
        </el-table>
      </el-card>
    </section>

    <section v-else-if="featureKey === 'reports'" class="content-grid single">
      <div class="report-center">
        <div class="report-cover">
          <div>
            <span>复用报告中心</span>
            <h3>经验库阶段复用简报</h3>
            <p>把经验库存量、风险治理、热门经验和落地动作整理成一页可阅读的业务报告。</p>
          </div>
          <el-button type="primary" :icon="DocumentCopy" @click="copyText(reportText, '报告已复制')">复制总报告</el-button>
        </div>

        <div class="report-summary-grid">
          <div v-for="item in reportSummaryCards" :key="item.label" class="report-summary-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.hint }}</em>
          </div>
        </div>

        <div class="report-layout">
          <el-card class="report-panel" shadow="never">
            <template #header>
              <div class="card-header">
                <span>热门经验</span>
                <el-tag type="primary" effect="plain">{{ reportHotList.length }} 条</el-tag>
              </div>
            </template>
            <div class="report-list">
              <div v-for="(item, index) in reportHotList" :key="item.id" class="report-list-item">
                <span class="report-index">{{ index + 1 }}</span>
                <div>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.projectName || '未填写项目' }} · 浏览 {{ item.viewCount || 0 }} · 采纳 {{ item.adoptCount || 0 }}</p>
                </div>
              </div>
            </div>
            <el-empty v-if="!reportHotList.length" description="暂无热门经验" />
          </el-card>

          <el-card class="report-panel" shadow="never">
            <template #header>
              <span>治理动作</span>
            </template>
            <ol class="report-action-list">
              <li v-for="item in reportGovernanceActions" :key="item">{{ item }}</li>
            </ol>
          </el-card>
        </div>

        <el-card class="report-document" shadow="never">
          <template #header>
            <div class="card-header">
              <span>报告预览</span>
              <span class="report-date">{{ reportDate }}</span>
            </div>
          </template>
          <div class="document-title">
            <span>经验库复用报告</span>
            <h3>复用现状与治理建议</h3>
          </div>
          <div class="document-grid">
            <section>
              <span>核心结论</span>
              <p>当前共沉淀 {{ experienceList.length }} 条经验，其中 {{ riskList.filter((item) => item.riskLevel === '高').length }} 条高风险经验需要优先转为项目检查项。</p>
            </section>
            <section>
              <span>复用表现</span>
              <p>整体采纳转化率为 {{ totalAdoptionRate }}%，收藏经验 {{ favoriteList.length }} 条，可作为后续复用跟进池。</p>
            </section>
            <section>
              <span>治理重点</span>
              <p>待完善经验 {{ incompleteList.length }} 条，建议优先补齐场景、原因、方案、总结和复用边界。</p>
            </section>
            <section>
              <span>推荐动作</span>
              <p>选择热门但采纳偏低的经验补充执行步骤，并将高风险经验同步到项目启动、评审和上线检查清单。</p>
            </section>
          </div>
        </el-card>
      </div>
    </section>

    <section v-else-if="featureKey === 'recent'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>最近浏览</span>
        </template>
        <div class="timeline-list">
          <div v-for="item in recentViews" :key="item.id" class="timeline-item">
            <strong>{{ item.title }}</strong>
            <span>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }}</span>
          </div>
        </div>
        <el-empty v-if="!recentViews.length" description="暂无浏览记录" />
      </el-card>
    </section>

    <section v-else-if="featureKey === 'notes'" class="content-grid single">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>个人笔记</span>
        </template>
        <div class="note-grid">
          <div v-for="item in noteList" :key="item.id" class="note-card">
            <strong>{{ item.title }}</strong>
            <p>{{ item.note }}</p>
          </div>
        </div>
        <el-empty v-if="!noteList.length" description="暂无笔记" />
      </el-card>
    </section>

    <section v-else-if="featureKey === 'operations'" class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>运营健康度</span>
        </template>
        <div class="ops-grid">
          <div v-for="item in operationCards" :key="item.label" class="ops-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.hint }}</em>
          </div>
        </div>
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>本周运营动作</span>
        </template>
        <ol class="suggestion-list">
          <li>挑选 3 条高价值经验推送给项目负责人，推动复用任务落地。</li>
          <li>清理无标签、低完整度经验，提升检索和推荐质量。</li>
          <li>对高浏览低采纳经验补充“适用场景”和“执行步骤”。</li>
          <li>将高风险经验沉淀为上线、评审、验收检查项。</li>
        </ol>
      </el-card>
    </section>

    <section v-else class="content-grid">
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>本地工具数据</span>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="收藏经验">{{ favoriteIds.length }} 条</el-descriptions-item>
          <el-descriptions-item label="对比暂存">{{ compareItems.length }} 条</el-descriptions-item>
          <el-descriptions-item label="最近浏览">{{ recentViews.length }} 条</el-descriptions-item>
          <el-descriptions-item label="个人笔记">{{ noteList.length }} 条</el-descriptions-item>
          <el-descriptions-item label="复用任务">{{ reuseTasks.length }} 个</el-descriptions-item>
        </el-descriptions>
      </el-card>
      <el-card class="feature-card" shadow="never">
        <template #header>
          <span>维护操作</span>
        </template>
        <div class="setting-actions">
          <el-button type="warning" @click="clearLocalKey('experience_compare_items')">清空对比暂存</el-button>
          <el-button type="warning" @click="clearLocalKey('experience_recent_views')">清空最近浏览</el-button>
          <el-button type="danger" @click="clearLocalKey('experience_reuse_tasks')">清空复用任务</el-button>
        </div>
      </el-card>
    </section>

    <el-dialog v-model="taskDialogVisible" title="新增复用任务" width="620px">
      <el-form :model="taskForm" label-width="90px">
        <el-form-item label="任务标题">
          <el-input v-model="taskForm.title" placeholder="请输入任务标题" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="taskForm.assignee" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="taskForm.dueDate" value-format="YYYY-MM-DD" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addTask">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DocumentCopy, Plus, Refresh } from '@element-plus/icons-vue'
import { getDashboardData, getExperienceList } from '../api/experience'

const route = useRoute()
const experienceList = ref([])
const dashboard = ref({})
const loading = ref(false)
const taskDialogVisible = ref(false)
const taskForm = ref({
  title: '',
  assignee: '',
  dueDate: '',
  remark: '',
})

const featureKey = computed(() => route.meta?.featureKey || 'settings')

const configs = {
  favorites: {
    title: '收藏夹',
    group: '复用协同',
    desc: '集中查看你关注的经验，适合做项目启动前的重点复用清单。',
    primaryAction: '导出收藏报告',
    primaryIcon: DocumentCopy,
  },
  'reuse-tasks': {
    title: '复用任务',
    group: '复用协同',
    desc: '把经验转化为待办、负责人和截止日期，形成真正可跟进的复用闭环。',
    primaryAction: '新增任务',
    primaryIcon: Plus,
  },
  'risk-warning': {
    title: '风险预警',
    group: '风险洞察',
    desc: '聚合高风险和中风险经验，帮助项目早识别、早处理、早复盘。',
  },
  recommendations: {
    title: '智能推荐',
    group: '复用协同',
    desc: '基于复用价值、浏览采纳、风险等级和内容完整度，推荐最值得带入项目的经验。',
  },
  'adoption-tracking': {
    title: '采纳跟踪',
    group: '复用协同',
    desc: '观察经验从浏览到采纳的转化表现，找出需要补充说明或推动落地的内容。',
  },
  'project-lens': {
    title: '项目视角',
    group: '知识沉淀',
    desc: '按项目汇总经验、风险和问题覆盖，适合项目复盘和启动前对齐。',
  },
  'tag-governance': {
    title: '标签治理',
    group: '知识治理',
    desc: '发现缺失、过少或过散的标签，提升检索、推荐和知识图谱质量。',
  },
  improvement: {
    title: '待完善',
    group: '知识治理',
    desc: '自动发现内容不完整的经验，推动场景、原因、方案和复用边界补齐。',
  },
  templates: {
    title: '模板中心',
    group: '知识沉淀',
    desc: '提供常见经验写作模板，降低团队沉淀经验的起步成本。',
  },
  'knowledge-map': {
    title: '知识图谱',
    group: '风险洞察',
    desc: '按项目、问题类型和标签观察经验之间的关联关系。',
  },
  reports: {
    title: '报告中心',
    group: '复用输出',
    desc: '生成当前经验库的复用摘要，用于项目复盘或阶段汇报。',
    primaryAction: '复制报告',
    primaryIcon: DocumentCopy,
  },
  recent: {
    title: '最近浏览',
    group: '个人工作台',
    desc: '快速回到最近查看过的经验，减少反复搜索。',
  },
  notes: {
    title: '个人笔记',
    group: '个人工作台',
    desc: '汇总你在经验详情中留下的复用想法和二次理解。',
  },
  settings: {
    title: '工具设置',
    group: '系统工具',
    desc: '查看和维护本地增强功能的数据，包括收藏、对比、笔记和任务。',
  },
  operations: {
    title: '运营视图',
    group: '系统工具',
    desc: '从运营健康度和本周动作观察经验库的沉淀、治理、复用和风险闭环。',
  },
}

const config = computed(() => configs[featureKey.value] || configs.settings)

const templates = [
  {
    name: '需求变更复盘',
    desc: '适合记录需求范围、变更评审、客户确认和延期预防。',
    tags: ['需求管理', '变更控制', '客户确认'],
    content: '场景：客户在关键节点提出新增或调整需求。\n问题：需求边界不清晰导致计划被反复打断。\n原因：前期确认不足，变更入口和评审机制缺失。\n方案：建立需求基线、变更评审和版本记录。\n总结：需求变更必须可记录、可评估、可确认。',
  },
  {
    name: '上线故障复盘',
    desc: '适合系统发布、接口联调、数据迁移和紧急故障处理。',
    tags: ['上线发布', '故障复盘', '风险预警'],
    content: '场景：系统上线后生产环境出现异常。\n问题：用户业务操作受阻。\n原因：验证覆盖不足，回滚和监控准备不充分。\n方案：先恢复服务，再定位根因，补充发布清单。\n总结：上线必须包含验证、监控、回滚和责任人。',
  },
  {
    name: '客户沟通闭环',
    desc: '适合跨部门协同、客户确认、会议纪要和问题闭环。',
    tags: ['客户沟通', '会议纪要', '责任分工'],
    content: '场景：多方参与事项理解不一致。\n问题：任务反复确认，责任人不清晰。\n原因：会议结论没有及时固化。\n方案：纪要明确事项、责任人、截止时间和确认人。\n总结：把说过变成确认过。',
  },
  {
    name: '质量返工复盘',
    desc: '适合交付物评审、测试验收、返工整改和质量提升。',
    tags: ['质量提升', '交付评审', '验收标准'],
    content: '场景：交付或验收阶段发现质量问题。\n问题：返工次数增加，验收周期拉长。\n原因：质量标准前置不足，过程评审不充分。\n方案：建立交付检查清单和预验收机制。\n总结：质量问题要前置拦截。',
  },
]

const taskColumns = [
  { label: '待办', value: 'TODO' },
  { label: '进行中', value: 'DOING' },
  { label: '已完成', value: 'DONE' },
]

const favoriteIds = computed(() => readStorage('experience_favorite_ids', []))
const compareItems = computed(() => readStorage('experience_compare_items', []))
const recentViews = computed(() => readStorage('experience_recent_views', []))
const noteMap = computed(() => readStorage('experience_personal_notes', {}))
const reuseTasks = ref(readStorage('experience_reuse_tasks', []))

const favoriteList = computed(() => {
  return experienceList.value.filter((item) => favoriteIds.value.includes(Number(item.id)))
})

const riskList = computed(() => {
  return experienceList.value
    .filter((item) => ['高', '中'].includes(item.riskLevel))
    .sort((a, b) => riskWeight(b.riskLevel) - riskWeight(a.riskLevel) || normalizeScore(b.referenceValueScore) - normalizeScore(a.referenceValueScore))
})

const incompleteList = computed(() => {
  return experienceList.value
    .filter((item) => completionPercent(item) < 75)
    .sort((a, b) => completionPercent(a) - completionPercent(b))
})

const tagCloud = computed(() => {
  const map = new Map()
  experienceList.value.forEach((item) => {
    splitTags(item.tags).forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1))
  })
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})

const matrixRows = computed(() => {
  const map = new Map()
  experienceList.value.forEach((item) => {
    const key = item.projectName || '未填写项目'
    if (!map.has(key)) {
      map.set(key, { projectName: key, problemTypes: new Set(), count: 0 })
    }
    const row = map.get(key)
    row.problemTypes.add(item.problemType || '综合管理')
    row.count += 1
  })
  return [...map.values()].map((item) => ({
    projectName: item.projectName,
    problemTypes: [...item.problemTypes].join('、'),
    count: item.count,
  }))
})

const noteList = computed(() => {
  return Object.keys(noteMap.value)
    .map((id) => {
      const exp = experienceList.value.find((item) => Number(item.id) === Number(id))
      return {
        id,
        title: exp?.title || `经验 ${id}`,
        note: noteMap.value[id],
      }
    })
    .filter((item) => item.note)
})

const recommendationList = computed(() => {
  return [...experienceList.value]
    .sort((a, b) => recommendScore(b) - recommendScore(a))
    .slice(0, 8)
})

const adoptionRows = computed(() => {
  return experienceList.value
    .map((item) => {
      const viewCountValue = Number(item.viewCount || 0)
      const adoptCountValue = Number(item.adoptCount || 0)
      const adoptionRate = viewCountValue ? Math.min(100, Math.round((adoptCountValue / viewCountValue) * 100)) : 0
      return {
        ...item,
        viewCountValue,
        adoptCountValue,
        adoptionRate,
        suggestion: adoptionSuggestion(viewCountValue, adoptCountValue, adoptionRate),
      }
    })
    .sort((a, b) => b.viewCountValue - a.viewCountValue || a.adoptionRate - b.adoptionRate)
})

const totalAdoptionRate = computed(() => {
  const viewTotal = experienceList.value.reduce((sum, item) => sum + Number(item.viewCount || 0), 0)
  const adoptTotal = experienceList.value.reduce((sum, item) => sum + Number(item.adoptCount || 0), 0)
  return viewTotal ? Math.min(100, Math.round((adoptTotal / viewTotal) * 100)) : 0
})

const projectLensRows = computed(() => {
  const map = new Map()
  experienceList.value.forEach((item) => {
    const key = item.projectName || '未填写项目'
    if (!map.has(key)) {
      map.set(key, {
        projectName: key,
        count: 0,
        highRiskCount: 0,
        scoreTotal: 0,
        viewTotal: 0,
        adoptTotal: 0,
        problemTypes: new Set(),
      })
    }
    const row = map.get(key)
    row.count += 1
    row.highRiskCount += item.riskLevel === '高' ? 1 : 0
    row.scoreTotal += normalizeScore(item.referenceValueScore)
    row.viewTotal += Number(item.viewCount || 0)
    row.adoptTotal += Number(item.adoptCount || 0)
    row.problemTypes.add(item.problemType || '综合管理')
  })
  return [...map.values()]
    .map((item) => {
      const adoptionRate = item.viewTotal ? Math.round((item.adoptTotal / item.viewTotal) * 100) : 0
      return {
        ...item,
        avgScore: item.count ? Math.round(item.scoreTotal / item.count) : 0,
        problemTypes: [...item.problemTypes].join('、'),
        suggestion: projectSuggestion(item.highRiskCount, adoptionRate, item.count),
      }
    })
    .sort((a, b) => b.count - a.count || b.highRiskCount - a.highRiskCount)
})

const tagGovernanceRows = computed(() => {
  return experienceList.value
    .map((item) => {
      const tags = splitTags(item.tags)
      const status = tags.length === 0 ? '缺标签' : tags.length === 1 ? '偏少' : tags.length > 5 ? '偏散' : '良好'
      return {
        id: item.id,
        title: item.title,
        tagsText: tags.join('、') || '未设置',
        status,
        action: tagAction(status),
      }
    })
    .sort((a, b) => tagStatusWeight(a.status) - tagStatusWeight(b.status))
})

const operationCards = computed(() => {
  const total = Number(dashboard.value.totalCount ?? dashboard.value.totalExperienceCount ?? experienceList.value.length)
  const localActionTotal = favoriteIds.value.length + compareItems.value.length + reuseTasks.value.length + noteList.value.length
  return [
    { label: '经验库存量', value: total, hint: '可复用知识资产' },
    { label: '复用转化率', value: `${totalAdoptionRate.value}%`, hint: '采纳 / 浏览' },
    { label: '治理待办', value: incompleteList.value.length, hint: '低完整度经验' },
    { label: '风险资产', value: riskList.value.length, hint: '中高风险经验' },
    { label: '项目覆盖', value: projectLensRows.value.length, hint: '已有沉淀项目' },
    { label: '本地动作', value: localActionTotal, hint: '收藏对比笔记任务' },
  ]
})

const reportDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
})

const reportHotList = computed(() => {
  return [...experienceList.value]
    .sort((a, b) => (Number(b.viewCount || 0) + Number(b.adoptCount || 0) * 2) - (Number(a.viewCount || 0) + Number(a.adoptCount || 0) * 2))
    .slice(0, 5)
})

const reportSummaryCards = computed(() => {
  return [
    { label: '经验总数', value: experienceList.value.length, hint: '已沉淀知识资产' },
    { label: '高风险经验', value: riskList.value.filter((item) => item.riskLevel === '高').length, hint: '优先转检查项' },
    { label: '待完善', value: incompleteList.value.length, hint: '需要补齐内容' },
    { label: '复用转化', value: `${totalAdoptionRate.value}%`, hint: '采纳 / 浏览' },
  ]
})

const reportGovernanceActions = computed(() => [
  `优先复盘 ${riskList.value.filter((item) => item.riskLevel === '高').length} 条高风险经验，沉淀为项目检查项。`,
  `补齐 ${incompleteList.value.length} 条待完善经验的场景、原因、方案、总结和复用边界。`,
  '对热门但采纳低的经验补充可执行步骤，降低团队复用成本。',
  `从 ${projectLensRows.value.length} 个项目维度观察问题覆盖，推动项目复盘标准化。`,
])

const stats = computed(() => {
  const total = experienceList.value.length
  const highRisk = experienceList.value.filter((item) => item.riskLevel === '高').length
  const avgScore = total
    ? Math.round(experienceList.value.reduce((sum, item) => sum + normalizeScore(item.referenceValueScore), 0) / total)
    : 0
  return [
    { label: '经验总数', value: total, hint: '已发布经验', tone: 'blue' },
    { label: '收藏经验', value: favoriteList.value.length, hint: '重点关注', tone: 'orange' },
    { label: '复用任务', value: reuseTasks.value.length, hint: '本地跟进', tone: 'green' },
    { label: '高风险', value: highRisk, hint: '优先复盘', tone: 'red' },
    { label: '待完善', value: incompleteList.value.length, hint: '内容治理', tone: 'yellow' },
    { label: '平均评分', value: avgScore, hint: '复用价值', tone: 'purple' },
  ]
})

const reportText = computed(() => {
  const hotList = [...experienceList.value]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.title}（${item.projectName || '未填写项目'}，浏览 ${item.viewCount || 0}，采纳 ${item.adoptCount || 0}）`)
    .join('\n')
  return [
    '# 经验库复用报告',
    '',
    `经验总数：${experienceList.value.length}`,
    `高风险经验：${riskList.value.filter((item) => item.riskLevel === '高').length}`,
    `待完善经验：${incompleteList.value.length}`,
    `收藏经验：${favoriteList.value.length}`,
    '',
    '## 热门经验',
    hotList || '暂无数据',
    '',
    '## 治理建议',
    '- 高风险经验优先转化为项目检查项。',
    '- 待完善经验补齐场景、原因、方案、总结和复用边界。',
    '- 热门但采纳低的经验需要补充可执行步骤。',
  ].join('\n')
})

const loadData = async () => {
  loading.value = true
  try {
    const [listRes, dashboardRes] = await Promise.allSettled([getExperienceList({}), getDashboardData()])
    if (listRes.status === 'fulfilled' && listRes.value.data.code === 200) {
      experienceList.value = listRes.value.data.data || []
    }
    if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data.code === 200) {
      dashboard.value = dashboardRes.value.data.data || {}
    }
  } catch (error) {
    ElMessage.error('加载数据失败，请检查后端接口')
  } finally {
    loading.value = false
  }
}

const handlePrimaryAction = () => {
  if (featureKey.value === 'reuse-tasks') {
    taskDialogVisible.value = true
    return
  }
  if (featureKey.value === 'reports') {
    copyText(reportText.value, '报告已复制')
    return
  }
  if (featureKey.value === 'favorites') {
    copyText(favoriteReport(), '收藏报告已复制')
  }
}

const addTask = () => {
  if (!taskForm.value.title.trim()) {
    ElMessage.warning('请输入任务标题')
    return
  }
  reuseTasks.value = [
    ...reuseTasks.value,
    {
      id: Date.now(),
      title: taskForm.value.title.trim(),
      assignee: taskForm.value.assignee.trim(),
      dueDate: taskForm.value.dueDate,
      remark: taskForm.value.remark.trim(),
      status: 'TODO',
    },
  ]
  persistTasks()
  taskDialogVisible.value = false
  taskForm.value = { title: '', assignee: '', dueDate: '', remark: '' }
  ElMessage.success('复用任务已创建')
}

const updateTaskStatus = (task, status) => {
  reuseTasks.value = reuseTasks.value.map((item) => (item.id === task.id ? { ...item, status } : item))
  persistTasks()
}

const deleteTask = (task) => {
  reuseTasks.value = reuseTasks.value.filter((item) => item.id !== task.id)
  persistTasks()
}

const tasksByStatus = (status) => {
  return reuseTasks.value.filter((item) => item.status === status)
}

const persistTasks = () => {
  writeStorage('experience_reuse_tasks', reuseTasks.value)
}

const clearLocalKey = (key) => {
  window.localStorage.removeItem(key)
  if (key === 'experience_reuse_tasks') reuseTasks.value = []
  ElMessage.success('已清理')
}

const favoriteReport = () => {
  return favoriteList.value
    .map((item, index) => `${index + 1}. ${item.title}｜${item.projectName || '未填写项目'}｜${item.problemType || '综合管理'}｜${item.riskLevel || '低'}风险`)
    .join('\n') || '暂无收藏经验'
}

const copyText = async (text, message) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(message)
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制')
  }
}

const completionPercent = (item) => {
  const fields = ['sceneDesc', 'problemDesc', 'reasonAnalysis', 'solution', 'summary', 'reuseScenario', 'tags']
  const completed = fields.filter((field) => item?.[field] && String(item[field]).trim()).length
  return Math.round((completed / fields.length) * 100)
}

const missingFields = (item) => {
  const fieldMap = [
    ['sceneDesc', '场景'],
    ['problemDesc', '问题'],
    ['reasonAnalysis', '原因'],
    ['solution', '方案'],
    ['summary', '总结'],
    ['reuseScenario', '复用场景'],
    ['tags', '标签'],
  ]
  return fieldMap
    .filter(([field]) => !item?.[field] || !String(item[field]).trim())
    .map(([, label]) => label)
}

const splitTags = (tags) => {
  if (!tags) return []
  return String(tags)
    .split(/[,，;；、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const normalizeScore = (score) => {
  const value = Number(score || 0)
  return Math.max(0, Math.min(100, Math.round(value)))
}

const riskWeight = (level) => {
  if (level === '高') return 3
  if (level === '中') return 2
  return 1
}

const recommendScore = (item) => {
  const valueScore = normalizeScore(item.referenceValueScore)
  const riskBonus = riskWeight(item.riskLevel) * 6
  const hotBonus = Math.min(18, Math.round((Number(item.viewCount || 0) + Number(item.adoptCount || 0) * 2) / 5))
  const completeBonus = Math.round(completionPercent(item) / 8)
  return Math.min(100, valueScore + riskBonus + hotBonus + completeBonus)
}

const adoptionSuggestion = (viewCount, adoptCount, adoptionRate) => {
  if (viewCount === 0) return '先补充摘要和标签，提升曝光'
  if (adoptionRate >= 60) return '沉淀为标杆案例，进入推荐清单'
  if (viewCount >= 20 && adoptCount === 0) return '浏览高但无人采纳，补充执行步骤'
  if (adoptionRate < 20) return '补充适用边界和复用场景'
  return '保持跟踪，可转为复用任务'
}

const projectSuggestion = (highRiskCount, adoptionRate, count) => {
  if (highRiskCount > 0) return `存在 ${highRiskCount} 条高风险经验，建议纳入项目检查项`
  if (count >= 5 && adoptionRate < 30) return '经验沉淀较多但采纳偏低，建议做专题复盘'
  if (count <= 1) return '项目沉淀偏少，建议补充关键节点经验'
  return '经验覆盖稳定，可继续扩展复用场景'
}

const tagAction = (status) => {
  if (status === '缺标签') return '补充 2 到 5 个业务标签'
  if (status === '偏少') return '增加问题类型、场景或项目阶段标签'
  if (status === '偏散') return '合并同义词，保留核心标签'
  return '保持当前标签结构'
}

const tagStatusWeight = (status) => {
  const weights = { 缺标签: 0, 偏少: 1, 偏散: 2, 良好: 3 }
  return weights[status] ?? 4
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

watch(
  () => route.fullPath,
  () => {
    reuseTasks.value = readStorage('experience_reuse_tasks', [])
  },
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.feature-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feature-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
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

.feature-header h2 {
  margin: 0;
  color: #111827;
  font-size: 26px;
  font-weight: 800;
}

.feature-header p {
  margin: 10px 0 0;
  color: #6b7280;
}

.header-actions,
.card-header,
.task-meta,
.task-actions,
.compare-toolbar,
.setting-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.stat-card span,
.stat-card em {
  display: block;
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.stat-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #111827;
  font-size: 28px;
}

.stat-card.blue strong { color: #1677ff; }
.stat-card.orange strong { color: #ff9f0a; }
.stat-card.green strong { color: #34c759; }
.stat-card.red strong { color: #f56c6c; }
.stat-card.yellow strong { color: #e6a23c; }
.stat-card.purple strong { color: #8b5cf6; }

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.content-grid.single {
  grid-template-columns: 1fr;
}

.feature-card {
  border-radius: 8px;
}

.card-header {
  justify-content: space-between;
  font-weight: 800;
}

.kanban {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.kanban-column {
  min-height: 360px;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.kanban-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 800;
}

.task-list,
.rank-list,
.timeline-list,
.note-grid {
  display: grid;
  gap: 12px;
}

.task-card,
.rank-item,
.timeline-item,
.note-card {
  padding: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.task-card strong,
.rank-item strong,
.timeline-item strong,
.note-card strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.task-card p,
.rank-item p,
.note-card p {
  margin: 0 0 10px;
  color: #6b7280;
  line-height: 1.6;
}

.task-meta,
.timeline-item span {
  color: #6b7280;
  font-size: 13px;
}

.rank-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  align-items: center;
  gap: 18px;
}

.score-pill {
  justify-self: end;
  min-width: 82px;
  padding: 10px 12px;
  color: #1677ff;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  background: #eaf3ff;
  border: 1px solid #cfe2ff;
  border-radius: 8px;
}

.suggestion-list {
  margin: 0;
  padding-left: 22px;
  color: #303133;
  line-height: 2;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 220px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.template-card strong {
  color: #111827;
  font-size: 16px;
}

.template-card p {
  flex: 1;
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-cloud.large {
  min-height: 260px;
  align-content: flex-start;
}

.report-center {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.report-cover {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.report-cover span {
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.report-cover h3 {
  margin: 8px 0;
  color: #111827;
  font-size: 26px;
}

.report-cover p {
  margin: 0;
  color: #6b7280;
  line-height: 1.7;
}

.report-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.report-summary-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.report-summary-card span,
.report-summary-card em,
.report-date {
  display: block;
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.report-summary-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #111827;
  font-size: 28px;
}

.report-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.report-panel,
.report-document {
  border-radius: 8px;
}

.report-list {
  display: grid;
  gap: 12px;
}

.report-list-item {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.report-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: #1677ff;
  font-weight: 800;
  background: #eaf3ff;
  border-radius: 8px;
}

.report-list-item strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.report-list-item p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.report-action-list {
  margin: 0;
  padding-left: 20px;
  color: #303133;
  line-height: 2;
}

.document-title {
  padding: 8px 2px 18px;
  border-bottom: 1px solid #eef2f7;
}

.document-title span {
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.document-title h3 {
  margin: 8px 0 0;
  color: #111827;
  font-size: 24px;
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding-top: 18px;
}

.document-grid section {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.document-grid span {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 800;
}

.document-grid p {
  margin: 0;
  color: #4b5563;
  line-height: 1.8;
}

.setting-actions {
  align-items: stretch;
  flex-direction: column;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.ops-card {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.ops-card span,
.ops-card em {
  display: block;
  color: #6b7280;
  font-size: 13px;
  font-style: normal;
}

.ops-card strong {
  display: block;
  margin: 8px 0 4px;
  color: #111827;
  font-size: 26px;
}

@media (max-width: 1320px) {
  .stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .report-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .feature-header,
  .report-cover,
  .rank-item {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .stat-grid,
  .content-grid,
  .kanban,
  .template-grid,
  .report-layout,
  .report-summary-grid,
  .document-grid,
  .ops-grid {
    grid-template-columns: 1fr;
  }
}
</style>
