<template>
  <div class="layout-container">
    <aside
      class="sidebar"
      :class="{ collapsed: isCollapsed }"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <div class="logo-area">
        <div class="logo-mark">知</div>

        <div v-show="!isCollapsed" class="logo-info">
          <div class="logo-title">经验沉淀平台</div>
          <div class="logo-subtitle">企业内部知识管理系统</div>
        </div>
      </div>

      <div class="menu-section">
        <div v-for="group in menuGroups" :key="group.title" class="menu-group">
          <div v-show="!isCollapsed" class="menu-caption">{{ group.title }}</div>

          <router-link
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="menu-item"
            :class="{ active: activeMenu === item.to, collapsed: isCollapsed }"
          >
            <el-icon class="menu-icon">
              <component :is="item.icon" />
            </el-icon>
            <span v-show="!isCollapsed" class="menu-text">{{ item.label }}</span>
          </router-link>
        </div>

        <div v-show="!isCollapsed" class="sidebar-card">
          <div class="sidebar-card-title">复用闭环</div>
          <div class="sidebar-card-text">收藏、对比、笔记、任务、报告已接入</div>
        </div>
      </div>

      <div class="sidebar-footer">
        <el-button class="collapse-btn" :icon="isCollapsed ? Expand : Fold" @click="toggleSidebar">
          {{ isCollapsed ? '' : '收起' }}
        </el-button>
      </div>

      <div
        v-if="!isCollapsed"
        class="resize-handle"
        @mousedown="startResize"
      ></div>
    </aside>

    <div class="main-area">
      <header class="top-header">
        <div class="page-title">{{ pageTitle }}</div>
        <div class="header-right">
          <div v-if="currentUser.name" class="user-chip">
            <span>{{ currentUser.name }}</span>
          </div>
          <div class="header-tag">经验沉淀 · 智能分析 · 检索复用 · 统计洞察</div>
        </div>
      </header>

      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  CollectionTag,
  Connection,
  DataAnalysis,
  Document,
  EditPen,
  Expand,
  Finished,
  Fold,
  Link,
  MagicStick,
  Notebook,
  SetUp,
  Star,
  Tickets,
  Timer,
  TrendCharts,
  WarningFilled,
} from '@element-plus/icons-vue'

const route = useRoute()
const currentUser = ref({})

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta?.title || '系统首页')

const menuGroups = [
  {
    title: '知识沉淀',
    items: [
      { label: '经验知识工作台', to: '/experience', icon: CollectionTag },
      { label: '本地AI助手', to: '/local-ai', icon: MagicStick },
      { label: '项目复用作战室', to: '/playbook', icon: MagicStick },
      { label: '模板中心', to: '/templates', icon: Tickets },
      { label: '标签治理', to: '/tag-governance', icon: CollectionTag },
      { label: '待完善经验', to: '/improvement', icon: EditPen },
      { label: '项目视角', to: '/project-lens', icon: Connection },
    ],
  },
  {
    title: '复用协同',
    items: [
      { label: '智能推荐', to: '/recommendations', icon: TrendCharts },
      { label: '场景演练', to: '/scenario-drill', icon: MagicStick },
      { label: '收藏夹', to: '/favorites', icon: Star },
      { label: '复用任务', to: '/reuse-tasks', icon: Finished },
      { label: '采纳跟踪', to: '/adoption-tracking', icon: Finished },
      { label: '最近浏览', to: '/recent', icon: Timer },
      { label: '个人笔记', to: '/notes', icon: Notebook },
    ],
  },
  {
    title: '风险洞察',
    items: [
      { label: '统计看板', to: '/dashboard', icon: DataAnalysis },
      { label: '风险预警', to: '/risk-warning', icon: WarningFilled },
      { label: '知识图谱', to: '/knowledge-map', icon: Connection },
      { label: '报告中心', to: '/reports', icon: Document },
    ],
  },
  {
    title: '系统工具',
    items: [
      { label: '飞书集成', to: '/feishu', icon: Link },
      { label: '运营视图', to: '/operations', icon: TrendCharts },
      { label: '工具设置', to: '/settings', icon: SetUp },
    ],
  },
]

const DEFAULT_WIDTH = 236
const MIN_WIDTH = 180
const MAX_WIDTH = 360
const COLLAPSED_WIDTH = 72

const sidebarWidth = ref(DEFAULT_WIDTH)
const lastExpandedWidth = ref(DEFAULT_WIDTH)
const isCollapsed = ref(false)
const isResizing = ref(false)

const toggleSidebar = () => {
  if (isCollapsed.value) {
    isCollapsed.value = false
    sidebarWidth.value = lastExpandedWidth.value
  } else {
    lastExpandedWidth.value = sidebarWidth.value
    isCollapsed.value = true
    sidebarWidth.value = COLLAPSED_WIDTH
  }
}

const startResize = () => {
  isResizing.value = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', handleResize)
  window.addEventListener('mouseup', stopResize)
}

const handleResize = (event) => {
  if (!isResizing.value || isCollapsed.value) return

  let nextWidth = event.clientX
  if (nextWidth < MIN_WIDTH) nextWidth = MIN_WIDTH
  if (nextWidth > MAX_WIDTH) nextWidth = MAX_WIDTH

  sidebarWidth.value = nextWidth
  lastExpandedWidth.value = nextWidth
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', handleResize)
  window.removeEventListener('mouseup', stopResize)
}

onBeforeUnmount(() => {
  stopResize()
})

onMounted(() => {
  try {
    currentUser.value = JSON.parse(window.localStorage.getItem('feishu_user') || '{}')
  } catch (error) {
    currentUser.value = {}
  }
})
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  min-height: 0;
  background: #f5f7fa;
  overflow: hidden;
}

.sidebar {
  position: relative;
  height: 100vh;
  background: #ffffff;
  color: #303133;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 10px rgba(15, 23, 42, 0.04);
  transition: width 0.2s ease;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 72px !important;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid #eef2f7;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  min-height: 88px;
  box-sizing: border-box;
}

.sidebar.collapsed .logo-area {
  justify-content: center;
  padding: 20px 0;
}

.logo-mark {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #60a5fa 0%, #34d399 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 6px 14px rgba(96, 165, 250, 0.18);
}

.logo-info {
  min-width: 0;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.2;
  margin-bottom: 6px;
  white-space: nowrap;
}

.logo-subtitle {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.menu-section {
  padding: 18px 14px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.collapsed .menu-section {
  padding: 18px 10px;
}

.menu-caption {
  font-size: 12px;
  color: #9ca3af;
  padding: 0 10px 8px;
  letter-spacing: 1px;
}

.menu-group {
  padding-bottom: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid #f1f5f9;
}

.menu-group:last-of-type {
  border-bottom: 0;
}

.sidebar.collapsed .menu-group {
  margin-bottom: 8px;
  padding-bottom: 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  color: #4b5563;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.menu-item:hover {
  background: #f3f6fb;
  color: #111827;
}

.menu-item.active {
  background: #eaf3ff;
  color: #1677ff;
  border: 1px solid #cfe2ff;
}

.menu-item.collapsed {
  justify-content: center;
  padding: 0;
  gap: 0;
}

.menu-icon {
  width: 20px;
  height: 20px;
  font-size: 18px;
  flex-shrink: 0;
}

.menu-text {
  font-size: 14px;
  font-weight: 600;
}

.sidebar-card {
  padding: 14px;
  margin: 8px 4px 0;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.sidebar-card-title {
  margin-bottom: 6px;
  color: #111827;
  font-size: 14px;
  font-weight: 800;
}

.sidebar-card-text {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.6;
}

.sidebar-footer {
  padding: 12px 14px 14px;
  border-top: 1px solid #eef2f7;
}

.sidebar.collapsed .sidebar-footer {
  padding: 10px 8px 12px;
}

.collapse-btn {
  width: 100%;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 20;
}

.resize-handle:hover {
  background: rgba(64, 158, 255, 0.18);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.top-header {
  height: 68px;
  flex-shrink: 0;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-tag {
  font-size: 13px;
  color: #909399;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  max-width: 180px;
  padding: 6px 10px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  background: #eaf3ff;
  border: 1px solid #cfe2ff;
  border-radius: 8px;
}

.user-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-area {
  flex: 1;
  min-height: 0;
  padding: 20px;
  overflow: auto;
  background: #f5f7fa;
}
</style>
