<template>
  <div class="admin-page">
    <section v-if="!isAuthed" class="login-panel">
      <div>
        <div class="eyebrow">管理后台</div>
        <h2>管理员审核中心</h2>
        <p>审核员工提交的新增、修改、删除和采纳申请，审核通过后才写入全局经验库。</p>
      </div>

      <el-form class="login-form" :model="loginForm" label-width="72px" autocomplete="off" @keyup.enter="submitLogin">
        <el-form-item label="账号">
          <el-input
            v-model="loginForm.username"
            clearable
            name="experience-admin-account"
            autocomplete="off"
            placeholder="请输入管理员账号"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="loginForm.password"
            type="password"
            show-password
            clearable
            name="experience-admin-password"
            autocomplete="new-password"
            placeholder="请输入管理员密码"
          />
        </el-form-item>
        <el-button type="primary" :icon="Lock" :loading="loginLoading" @click="submitLogin">
          登录审核后台
        </el-button>
      </el-form>
    </section>

    <template v-else>
      <section class="admin-header">
        <div>
          <div class="eyebrow">管理后台</div>
          <h2>管理员审核中心</h2>
          <p>当前管理员：{{ admin.name }}。待审核申请通过后，才会真正影响全局经验库。</p>
        </div>
        <div class="header-actions">
          <el-button :icon="Refresh" @click="refreshCurrentTab">刷新</el-button>
          <el-button @click="logout">退出登录</el-button>
        </div>
      </section>

      <el-tabs v-model="adminTab" class="admin-tabs" @tab-change="handleAdminTabChange">
        <el-tab-pane label="审核队列" name="approvals">
          <section class="stat-grid">
            <div class="stat-card blue">
              <span>待审核</span>
              <strong>{{ stats.pending || 0 }}</strong>
              <em>等待管理员处理</em>
            </div>
            <div class="stat-card green">
              <span>已通过</span>
              <strong>{{ stats.approved || 0 }}</strong>
              <em>已全局生效</em>
            </div>
            <div class="stat-card red">
              <span>已驳回</span>
              <strong>{{ stats.rejected || 0 }}</strong>
              <em>未进入经验库</em>
            </div>
            <div class="stat-card purple">
              <span>申请总数</span>
              <strong>{{ stats.total || 0 }}</strong>
              <em>所有审核记录</em>
            </div>
          </section>

          <el-card class="approval-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>操作审核队列</span>
                <el-radio-group v-model="activeStatus" @change="loadList">
                  <el-radio-button label="PENDING">待审核</el-radio-button>
                  <el-radio-button label="APPROVED">已通过</el-radio-button>
                  <el-radio-button label="REJECTED">已驳回</el-radio-button>
                  <el-radio-button label="ALL">全部</el-radio-button>
                </el-radio-group>
              </div>
            </template>

            <el-table :data="approvalList" border style="width: 100%" v-loading="loading">
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-tag :type="actionTagType(row.actionType)" effect="light">
                    {{ actionLabel(row.actionType) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="targetTitle" label="经验对象" min-width="220" />
              <el-table-column prop="applicantName" label="申请人" width="120" />
              <el-table-column label="申请摘要" min-width="280">
                <template #default="{ row }">
                  <span class="summary-text">{{ approvalSummary(row) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="110">
                <template #default="{ row }">
                  <el-tag :type="statusTagType(row.status)" effect="plain">
                    {{ statusLabel(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="申请时间" width="170">
                <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
              </el-table-column>
              <el-table-column label="审核信息" min-width="190">
                <template #default="{ row }">
                  <div class="review-info">
                    <strong>{{ row.reviewerName || '-' }}</strong>
                    <span>{{ formatDate(row.reviewTime) }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="210" fixed="right">
                <template #default="{ row }">
                  <el-button :icon="View" link type="primary" @click="openPreview(row)">查看</el-button>
                  <el-button
                    v-if="row.status === 'PENDING'"
                    :icon="Check"
                    link
                    type="success"
                    @click="openReview(row, 'approve')"
                  >
                    通过
                  </el-button>
                  <el-button
                    v-if="row.status === 'PENDING'"
                    :icon="Close"
                    link
                    type="danger"
                    @click="openReview(row, 'reject')"
                  >
                    驳回
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="管理员账号" name="admins">
          <el-card class="approval-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>管理员账号</span>
                <el-button type="primary" :icon="Plus" @click="openAdminCreate">新增管理员</el-button>
              </div>
            </template>
            <el-table :data="adminList" border style="width: 100%" v-loading="adminLoading">
              <el-table-column prop="username" label="账号" min-width="140" />
              <el-table-column prop="displayName" label="姓名" min-width="140" />
              <el-table-column prop="role" label="角色" width="130">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'SUPER_ADMIN' ? 'danger' : 'primary'" effect="plain">
                    {{ row.role === 'SUPER_ADMIN' ? '超级管理员' : '管理员' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="plain">
                    {{ row.status === 1 ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="creatorName" label="创建人" min-width="130" />
              <el-table-column label="最后登录" width="170">
                <template #default="{ row }">{{ formatDate(row.lastLoginTime) }}</template>
              </el-table-column>
              <el-table-column label="创建时间" width="170">
                <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>

        <el-tab-pane label="成员列表" name="members">
          <el-card class="approval-card" shadow="never">
            <template #header>
              <div class="card-header">
                <span>公司成员列表</span>
                <el-button :icon="Refresh" @click="loadMembers">刷新成员</el-button>
              </div>
            </template>
            <el-table :data="memberList" border style="width: 100%" v-loading="memberLoading">
              <el-table-column prop="name" label="姓名" min-width="150" />
              <el-table-column prop="userId" label="飞书 User ID" min-width="180" />
              <el-table-column prop="openId" label="Open ID" min-width="220" show-overflow-tooltip />
              <el-table-column prop="email" label="邮箱" min-width="190" show-overflow-tooltip />
              <el-table-column prop="mobile" label="手机号" min-width="140" />
              <el-table-column label="最后登录" width="170">
                <template #default="{ row }">{{ formatDate(row.lastLoginTime) }}</template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-tab-pane>
      </el-tabs>

      <el-drawer v-model="previewVisible" title="审核详情" size="54%">
        <div v-if="previewData" class="preview-panel">
          <section class="review-cover">
            <div>
              <el-tag :type="actionTagType(previewData.actionType)" effect="light">
                {{ actionLabel(previewData.actionType) }}
              </el-tag>
              <h3>{{ previewData.targetTitle || previewRequest.title || '未命名经验' }}</h3>
              <p>{{ approvalSummary(previewData) }}</p>
            </div>
            <div class="review-state" :class="previewData.status?.toLowerCase()">
              <strong>{{ statusLabel(previewData.status) }}</strong>
              <span>{{ formatDate(previewData.createTime) }}</span>
            </div>
          </section>

          <section class="review-meta-grid">
            <div v-for="item in previewMetaItems" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </section>

          <section v-if="previewData.actionType === 'ADOPT'" class="readable-section">
            <div class="section-head">
              <span>采纳申请</span>
              <el-tag type="success" effect="plain">待确认复用</el-tag>
            </div>
            <div class="adopt-card">
              <span>采纳人</span>
              <strong>{{ previewRequest.adopterName || previewData.applicantName || '系统用户' }}</strong>
              <p>{{ previewRequest.adoptComment || '未填写采纳说明' }}</p>
            </div>
            <div class="section-head compact">
              <span>关联经验</span>
            </div>
            <div class="field-list">
              <div v-for="row in originalRows" :key="row.field" class="field-row">
                <span>{{ row.label }}</span>
                <p>{{ formatFieldValue(row.oldValue) }}</p>
              </div>
            </div>
          </section>

          <section v-else-if="previewData.actionType === 'DELETE'" class="readable-section danger-section">
            <div class="section-head">
              <span>删除确认</span>
              <el-tag type="danger" effect="plain">通过后不可在列表查看</el-tag>
            </div>
            <p class="delete-warning">
              该申请会将《{{ previewData.targetTitle || previewOriginal.title || '未命名经验' }}》标记为删除，审核通过后从全局经验库、统计和推荐中移除。
            </p>
            <div class="field-list">
              <div v-for="row in originalRows" :key="row.field" class="field-row">
                <span>{{ row.label }}</span>
                <p>{{ formatFieldValue(row.oldValue) }}</p>
              </div>
            </div>
          </section>

          <section v-else class="readable-section">
            <div class="section-head">
              <span>{{ previewData.actionType === 'UPDATE' ? '变更对比' : '新增内容' }}</span>
              <el-tag :type="previewData.actionType === 'UPDATE' ? 'warning' : 'success'" effect="plain">
                {{ previewData.actionType === 'UPDATE' ? `${changedRows.length} 项变化` : `${readableRows.length} 项内容` }}
              </el-tag>
            </div>

            <div class="field-list">
              <div
                v-for="row in readableRows"
                :key="row.field"
                class="field-row"
                :class="{ changed: row.changed }"
              >
                <span>{{ row.label }}</span>
                <div v-if="previewData.actionType === 'UPDATE'" class="compare-values">
                  <div>
                    <em>原内容</em>
                    <p>{{ formatFieldValue(row.oldValue) }}</p>
                  </div>
                  <div>
                    <em>申请内容</em>
                    <p>{{ formatFieldValue(row.newValue) }}</p>
                  </div>
                </div>
                <p v-else>{{ formatFieldValue(row.newValue) }}</p>
              </div>
            </div>
          </section>

          <el-collapse class="technical-collapse">
            <el-collapse-item title="查看技术原文 JSON" name="raw">
              <div class="json-grid">
                <div class="json-section">
                  <span>申请原文</span>
                  <pre>{{ prettyJson(previewData.requestContent) }}</pre>
                </div>
                <div class="json-section">
                  <span>原始原文</span>
                  <pre>{{ prettyJson(previewData.originalContent) }}</pre>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </div>
      </el-drawer>

      <el-dialog v-model="reviewVisible" :title="reviewTitle" width="520px">
        <el-input
          v-model="reviewComment"
          type="textarea"
          :rows="4"
          placeholder="填写审核意见，便于后续追溯"
        />
        <template #footer>
          <el-button @click="reviewVisible = false">取消</el-button>
          <el-button
            :type="reviewAction === 'approve' ? 'success' : 'danger'"
            :loading="reviewLoading"
            @click="submitReview"
          >
            确认{{ reviewAction === 'approve' ? '通过' : '驳回' }}
          </el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="adminCreateVisible" title="新增管理员" width="520px">
        <el-form :model="adminForm" label-width="96px" autocomplete="off">
          <el-form-item label="登录账号" required>
            <el-input
              v-model="adminForm.username"
              clearable
              name="new-admin-account"
              autocomplete="off"
              placeholder="请输入管理员登录账号"
            />
          </el-form-item>
          <el-form-item label="管理员姓名" required>
            <el-input v-model="adminForm.displayName" clearable placeholder="请输入管理员姓名" />
          </el-form-item>
          <el-form-item label="登录密码" required>
            <el-input
              v-model="adminForm.password"
              type="password"
              show-password
              clearable
              name="new-admin-password"
              autocomplete="new-password"
              placeholder="至少 6 位"
            />
          </el-form-item>
          <el-form-item label="确认密码" required>
            <el-input
              v-model="adminForm.confirmPassword"
              type="password"
              show-password
              clearable
              name="new-admin-password-confirm"
              autocomplete="new-password"
              placeholder="请再次输入密码"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="adminCreateVisible = false">取消</el-button>
          <el-button type="primary" :loading="adminCreateLoading" @click="submitAdminCreate">
            保存管理员
          </el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Close, Lock, Plus, Refresh, View } from '@element-plus/icons-vue'
import {
  approveApproval,
  createAdminUser,
  getAdminMembers,
  getAdminUsers,
  getApprovalList,
  getApprovalStats,
  getCurrentAdmin,
  loginAdmin,
  rejectApproval,
} from '../api/experience'

const loginForm = ref({
  username: '',
  password: '',
})
const loginLoading = ref(false)
const loading = ref(false)
const reviewLoading = ref(false)
const admin = ref(readStorage('admin_user', {}))
const approvalList = ref([])
const stats = ref({})
const activeStatus = ref('PENDING')
const previewVisible = ref(false)
const previewData = ref(null)
const reviewVisible = ref(false)
const reviewAction = ref('approve')
const reviewTarget = ref(null)
const reviewComment = ref('')
const adminTab = ref('approvals')
const adminLoading = ref(false)
const adminCreateLoading = ref(false)
const adminCreateVisible = ref(false)
const memberLoading = ref(false)
const adminList = ref([])
const memberList = ref([])
const adminForm = ref({
  username: '',
  displayName: '',
  password: '',
  confirmPassword: '',
})

const isAuthed = ref(!!window.localStorage.getItem('admin_token'))
const reviewTitle = computed(() => `${reviewAction.value === 'approve' ? '通过' : '驳回'}审核申请`)

const actionMeta = {
  CREATE: { label: '新增', type: 'success' },
  UPDATE: { label: '修改', type: 'warning' },
  DELETE: { label: '删除', type: 'danger' },
  ADOPT: { label: '采纳', type: 'success' },
}

const statusMeta = {
  PENDING: { label: '待审核', type: 'warning' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
}

const experienceFields = [
  { field: 'title', label: '经验标题' },
  { field: 'projectName', label: '项目名称' },
  { field: 'projectCode', label: '项目编号' },
  { field: 'industry', label: '行业领域' },
  { field: 'projectType', label: '项目类型' },
  { field: 'problemType', label: '问题类型' },
  { field: 'riskLevel', label: '风险等级' },
  { field: 'tags', label: '经验标签' },
  { field: 'reuseScenario', label: '复用场景' },
  { field: 'referenceValueScore', label: '价值评分' },
  { field: 'sceneDesc', label: '场景描述' },
  { field: 'problemDesc', label: '问题描述' },
  { field: 'reasonAnalysis', label: '原因分析' },
  { field: 'solution', label: '解决方案' },
  { field: 'summary', label: '经验总结' },
  { field: 'creatorName', label: '创建人' },
  { field: 'updaterName', label: '修改人' },
]

const previewRequest = computed(() => parseJson(previewData.value?.requestContent))
const previewOriginal = computed(() => parseJson(previewData.value?.originalContent))

const previewMetaItems = computed(() => {
  const data = previewData.value || {}
  return [
    { label: '申请人', value: data.applicantName || '-' },
    { label: '申请时间', value: formatDate(data.createTime) },
    { label: '审核人', value: data.reviewerName || '-' },
    { label: '审核时间', value: formatDate(data.reviewTime) },
    { label: '审核意见', value: data.reviewComment || '-' },
  ]
})

const allReadableRows = computed(() => {
  const request = previewRequest.value || {}
  const original = previewOriginal.value || {}
  return experienceFields.map((item) => {
    const oldValue = original[item.field]
    const newValue = request[item.field]
    return {
      ...item,
      oldValue,
      newValue,
      changed: normalizeFieldValue(oldValue) !== normalizeFieldValue(newValue),
    }
  })
})

const changedRows = computed(() => allReadableRows.value.filter((row) => row.changed && hasDisplayValue(row.newValue)))

const readableRows = computed(() => {
  if (!previewData.value) return []
  if (previewData.value.actionType === 'UPDATE') {
    return changedRows.value.length ? changedRows.value : allReadableRows.value.filter((row) => hasDisplayValue(row.newValue)).slice(0, 8)
  }
  if (previewData.value.actionType === 'CREATE') {
    return allReadableRows.value.filter((row) => hasDisplayValue(row.newValue))
  }
  return originalRows.value
})

const originalRows = computed(() => {
  return allReadableRows.value
    .filter((row) => hasDisplayValue(row.oldValue))
    .slice(0, 10)
})

const submitLogin = async () => {
  if (!loginForm.value.username || !loginForm.value.password) {
    ElMessage.warning('请输入管理员账号和密码')
    return
  }

  loginLoading.value = true
  try {
    const res = await loginAdmin(loginForm.value)
    if (res.data.code === 200) {
      window.localStorage.setItem('admin_token', res.data.data.token)
      admin.value = res.data.data.admin || {}
      writeStorage('admin_user', admin.value)
      isAuthed.value = true
      resetLoginForm()
      ElMessage.success('登录成功，已进入审核列表')
      await loadData()
    } else {
      ElMessage.error(res.data.msg || '登录失败')
    }
  } catch (error) {
    ElMessage.error('登录失败，请检查后端服务')
  } finally {
    loginLoading.value = false
  }
}

const verifyAdmin = async () => {
  if (!window.localStorage.getItem('admin_token')) {
    isAuthed.value = false
    resetLoginForm()
    return
  }
  try {
    const res = await getCurrentAdmin()
    if (res.data.code === 200) {
      admin.value = res.data.data || {}
      writeStorage('admin_user', admin.value)
      isAuthed.value = true
      await loadData()
    } else {
      logout(false)
    }
  } catch (error) {
    logout(false)
  }
}

const logout = (showMessage = true) => {
  window.localStorage.removeItem('admin_token')
  window.localStorage.removeItem('admin_user')
  isAuthed.value = false
  admin.value = {}
  approvalList.value = []
  adminList.value = []
  memberList.value = []
  stats.value = {}
  resetLoginForm()
  if (showMessage) ElMessage.success('已退出管理员登录')
}

const loadData = async () => {
  await Promise.all([loadStats(), loadList()])
}

const refreshCurrentTab = () => {
  handleAdminTabChange(adminTab.value)
}

const handleAdminTabChange = (name) => {
  if (name === 'approvals') {
    loadData()
  } else if (name === 'admins') {
    loadAdmins()
  } else if (name === 'members') {
    loadMembers()
  }
}

const loadStats = async () => {
  try {
    const res = await getApprovalStats()
    if (res.data.code === 200) {
      stats.value = res.data.data || {}
    }
  } catch (error) {
  }
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await getApprovalList(activeStatus.value)
    if (res.data.code === 200) {
      approvalList.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取审核列表失败')
    }
  } catch (error) {
    ElMessage.error('获取审核列表失败')
  } finally {
    loading.value = false
  }
}

const loadAdmins = async () => {
  adminLoading.value = true
  try {
    const res = await getAdminUsers()
    if (res.data.code === 200) {
      adminList.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取管理员列表失败')
    }
  } catch (error) {
    ElMessage.error('获取管理员列表失败')
  } finally {
    adminLoading.value = false
  }
}

const loadMembers = async () => {
  memberLoading.value = true
  try {
    const res = await getAdminMembers()
    if (res.data.code === 200) {
      memberList.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取成员列表失败')
    }
  } catch (error) {
    ElMessage.error('获取成员列表失败')
  } finally {
    memberLoading.value = false
  }
}

const openAdminCreate = () => {
  resetAdminForm()
  adminCreateVisible.value = true
}

const submitAdminCreate = async () => {
  const payload = {
    username: adminForm.value.username.trim(),
    displayName: adminForm.value.displayName.trim(),
    password: adminForm.value.password,
    role: 'ADMIN',
  }
  if (!payload.username || !payload.displayName || !payload.password) {
    ElMessage.warning('请填写管理员账号、姓名和密码')
    return
  }
  if (payload.password.length < 6) {
    ElMessage.warning('管理员密码至少 6 位')
    return
  }
  if (payload.password !== adminForm.value.confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  adminCreateLoading.value = true
  try {
    const res = await createAdminUser(payload)
    if (res.data.code === 200) {
      ElMessage.success('管理员已新增')
      adminCreateVisible.value = false
      resetAdminForm()
      await loadAdmins()
    } else {
      ElMessage.error(res.data.msg || '新增管理员失败')
    }
  } catch (error) {
    ElMessage.error('新增管理员失败')
  } finally {
    adminCreateLoading.value = false
  }
}

const openPreview = (row) => {
  previewData.value = row
  previewVisible.value = true
}

const openReview = (row, action) => {
  reviewTarget.value = row
  reviewAction.value = action
  reviewComment.value = ''
  reviewVisible.value = true
}

const submitReview = async () => {
  if (!reviewTarget.value?.id) return
  reviewLoading.value = true
  try {
    const payload = { id: reviewTarget.value.id, comment: reviewComment.value }
    const res = reviewAction.value === 'approve'
      ? await approveApproval(payload)
      : await rejectApproval(payload)
    if (res.data.code === 200 && res.data.data === true) {
      ElMessage.success(reviewAction.value === 'approve' ? '已审核通过' : '已驳回')
      reviewVisible.value = false
      await loadData()
    } else {
      ElMessage.error(res.data.msg || '审核处理失败')
    }
  } catch (error) {
    ElMessage.error('审核处理失败，请检查后端接口或数据库表')
  } finally {
    reviewLoading.value = false
  }
}

const approvalSummary = (row) => {
  const request = parseJson(row.requestContent)
  if (row.actionType === 'CREATE') return `新增《${request.title || row.targetTitle || '未命名经验'}》`
  if (row.actionType === 'UPDATE') return `修改《${row.targetTitle || request.title || '未命名经验'}》`
  if (row.actionType === 'DELETE') return `删除《${row.targetTitle || request.title || '未命名经验'}》`
  if (row.actionType === 'ADOPT') return `采纳说明：${request.adoptComment || '未填写'}`
  return row.targetTitle || '-'
}

const actionLabel = (type) => actionMeta[type]?.label || type || '-'
const actionTagType = (type) => actionMeta[type]?.type || 'info'
const statusLabel = (status) => statusMeta[status]?.label || status || '-'
const statusTagType = (status) => statusMeta[status]?.type || 'info'

const parseJson = (text) => {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    return {}
  }
}

const hasDisplayValue = (value) => {
  if (value === null || value === undefined) return false
  return String(value).trim() !== ''
}

const normalizeFieldValue = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).trim()
}

const formatFieldValue = (value) => {
  if (!hasDisplayValue(value)) return '未填写'
  if (Array.isArray(value)) return value.join('、')
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  if (text.includes('T') && /^\d{4}-\d{2}-\d{2}T/.test(text)) {
    return formatDate(text)
  }
  return text
}

const prettyJson = (text) => {
  if (!text) return '暂无'
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch (error) {
    return text
  }
}

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
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

function resetLoginForm() {
  loginForm.value = {
    username: '',
    password: '',
  }
}

function resetAdminForm() {
  adminForm.value = {
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  }
}

onMounted(() => {
  verifyAdmin()
})
</script>

<style scoped>
.admin-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-panel,
.admin-header,
.approval-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.login-panel,
.admin-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 28px;
  padding: 28px;
  align-items: center;
}

.eyebrow {
  margin-bottom: 8px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

h2 {
  margin: 0;
  color: #111827;
  font-size: 26px;
}

p {
  margin: 10px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.login-form {
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.login-form .el-button {
  width: 100%;
}

.header-actions,
.card-header,
.audit-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.card-header {
  justify-content: space-between;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  font-size: 30px;
}

.stat-card.blue strong { color: #1677ff; }
.stat-card.green strong { color: #34c759; }
.stat-card.red strong { color: #f56c6c; }
.stat-card.purple strong { color: #8b5cf6; }

.approval-card {
  border-radius: 8px;
}

.admin-tabs {
  padding: 0 2px;
}

.admin-tabs :deep(.el-tabs__content) {
  overflow: visible;
}

.admin-tabs :deep(.el-tab-pane) {
  display: grid;
  gap: 18px;
}

.summary-text {
  color: #4b5563;
  line-height: 1.6;
}

.review-info strong,
.review-info span {
  display: block;
}

.review-info span {
  color: #6b7280;
  font-size: 12px;
}

.preview-panel {
  display: grid;
  gap: 16px;
}

.review-cover {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 18px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.review-cover h3 {
  margin: 10px 0 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.35;
}

.review-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 112px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.review-state strong {
  color: #111827;
  font-size: 20px;
}

.review-state span {
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  text-align: center;
}

.review-state.pending strong { color: #e6a23c; }
.review-state.approved strong { color: #34c759; }
.review-state.rejected strong { color: #f56c6c; }

.review-meta-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.review-meta-grid div {
  min-width: 0;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.review-meta-grid span,
.field-row > span,
.adopt-card > span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
}

.review-meta-grid strong {
  display: block;
  color: #111827;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.readable-section {
  display: grid;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.danger-section {
  border-color: #ffd6d6;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-head.compact {
  margin-top: 4px;
}

.section-head span {
  color: #111827;
  font-size: 17px;
  font-weight: 800;
}

.field-list {
  display: grid;
  gap: 10px;
}

.field-row {
  padding: 13px 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.field-row.changed {
  background: #fffaf0;
  border-color: #ffe0a6;
}

.field-row p,
.adopt-card p,
.delete-warning {
  margin: 0;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.compare-values {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.compare-values div {
  min-width: 0;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.compare-values em {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}

.adopt-card {
  padding: 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
}

.adopt-card strong {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-size: 18px;
}

.delete-warning {
  padding: 14px;
  color: #7f1d1d;
  background: #fff1f0;
  border: 1px solid #ffd6d6;
  border-radius: 8px;
}

.technical-collapse {
  border: 0;
}

.json-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.json-section span {
  display: block;
  margin-bottom: 8px;
  color: #111827;
  font-weight: 800;
}

.json-section pre {
  max-height: 300px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  color: #d1d5db;
  background: #111827;
  border-radius: 8px;
  line-height: 1.6;
  white-space: pre-wrap;
}

@media (max-width: 1000px) {
  .login-panel,
  .admin-header,
  .stat-grid,
  .review-cover,
  .review-meta-grid,
  .compare-values,
  .json-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
