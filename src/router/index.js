import { createRouter, createWebHistory } from 'vue-router'
import LayoutView from '../views/LayoutView.vue'
import ExperienceListView from '../views/ExperienceListView.vue'
import DashboardView from '../views/DashboardView.vue'
import FeatureCenterView from '../views/FeatureCenterView.vue'
import ProjectPlaybookView from '../views/ProjectPlaybookView.vue'
import LocalAiView from '../views/LocalAiView.vue'
import ScenarioDrillView from '../views/ScenarioDrillView.vue'
import FeishuIntegrationView from '../views/FeishuIntegrationView.vue'
import FeishuAuthView from '../views/FeishuAuthView.vue'
import AdminReviewView from '../views/AdminReviewView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/feishu-auth',
      name: 'feishu-auth',
      component: FeishuAuthView,
      meta: {
        title: '飞书免登',
      },
    },
    {
      path: '/',
      component: LayoutView,
      redirect: '/experience',
      children: [
        {
          path: 'experience',
          name: 'experience-list',
          component: ExperienceListView,
          meta: {
            title: '经验知识工作台',
          },
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: '统计看板',
          },
        },
        {
          path: 'favorites',
          name: 'favorites',
          component: FeatureCenterView,
          meta: {
            title: '收藏夹',
            featureKey: 'favorites',
          },
        },
        {
          path: 'reuse-tasks',
          name: 'reuse-tasks',
          component: FeatureCenterView,
          meta: {
            title: '复用任务',
            featureKey: 'reuse-tasks',
          },
        },
        {
          path: 'risk-warning',
          name: 'risk-warning',
          component: FeatureCenterView,
          meta: {
            title: '风险预警',
            featureKey: 'risk-warning',
          },
        },
        {
          path: 'recommendations',
          name: 'recommendations',
          component: FeatureCenterView,
          meta: {
            title: '智能推荐',
            featureKey: 'recommendations',
          },
        },
        {
          path: 'playbook',
          name: 'project-playbook',
          component: ProjectPlaybookView,
          meta: {
            title: '项目复用作战室',
          },
        },
        {
          path: 'local-ai',
          name: 'local-ai',
          component: LocalAiView,
          meta: {
            title: '本地AI助手',
          },
        },
        {
          path: 'scenario-drill',
          name: 'scenario-drill',
          component: ScenarioDrillView,
          meta: {
            title: '场景演练',
          },
        },
        {
          path: 'adoption-tracking',
          name: 'adoption-tracking',
          component: FeatureCenterView,
          meta: {
            title: '采纳跟踪',
            featureKey: 'adoption-tracking',
          },
        },
        {
          path: 'project-lens',
          name: 'project-lens',
          component: FeatureCenterView,
          meta: {
            title: '项目视角',
            featureKey: 'project-lens',
          },
        },
        {
          path: 'tag-governance',
          name: 'tag-governance',
          component: FeatureCenterView,
          meta: {
            title: '标签治理',
            featureKey: 'tag-governance',
          },
        },
        {
          path: 'improvement',
          name: 'improvement',
          component: FeatureCenterView,
          meta: {
            title: '待完善经验',
            featureKey: 'improvement',
          },
        },
        {
          path: 'templates',
          name: 'templates',
          component: FeatureCenterView,
          meta: {
            title: '模板中心',
            featureKey: 'templates',
          },
        },
        {
          path: 'knowledge-map',
          name: 'knowledge-map',
          component: FeatureCenterView,
          meta: {
            title: '知识图谱',
            featureKey: 'knowledge-map',
          },
        },
        {
          path: 'reports',
          name: 'reports',
          component: FeatureCenterView,
          meta: {
            title: '报告中心',
            featureKey: 'reports',
          },
        },
        {
          path: 'recent',
          name: 'recent',
          component: FeatureCenterView,
          meta: {
            title: '最近浏览',
            featureKey: 'recent',
          },
        },
        {
          path: 'notes',
          name: 'notes',
          component: FeatureCenterView,
          meta: {
            title: '个人笔记',
            featureKey: 'notes',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: FeatureCenterView,
          meta: {
            title: '工具设置',
            featureKey: 'settings',
          },
        },
        {
          path: 'operations',
          name: 'operations',
          component: FeatureCenterView,
          meta: {
            title: '工作留痕',
            featureKey: 'operations',
          },
        },
        {
          path: 'admin-review',
          name: 'admin-review',
          component: AdminReviewView,
          meta: {
            title: '管理员审核',
          },
        },
        {
          path: 'feishu',
          name: 'feishu',
          component: FeishuIntegrationView,
          meta: {
            title: '飞书集成',
          },
        },
      ],
    },
  ],
})

export default router
