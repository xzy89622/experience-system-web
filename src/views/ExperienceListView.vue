<template>
  <div class="page-container">
    <section class="workbench">
      <div>
        <div class="eyebrow">知识工作台</div>
        <h2 class="workbench-title">项目经验沉淀与复用</h2>
        <p class="workbench-desc">把历史问题、解决方案、风险标签和复用动作集中在一个工作台里。</p>
        <p class="operator-tip" :class="{ warning: !operatorReady }">
          当前操作人：{{ currentOperatorName }}，{{ operatorReady ? '新增、修改、采纳、删除需管理员审核，通过后自动写入工作留痕。' : '未识别到飞书身份，请从飞书工作台入口进入后再操作。' }}
        </p>
      </div>

      <div class="workbench-actions">
        <el-button :icon="Tickets" @click="templateVisible = true">写作模板</el-button>
        <el-button :icon="Notebook" :type="myApprovalAttentionCount ? 'warning' : ''" @click="openMyApprovalDrawer">
          审核状态 {{ myApprovalAttentionCount || '' }}
        </el-button>
        <el-button :icon="Star" :type="favoriteOnly ? 'warning' : ''" @click="toggleFavoriteFilter">
          收藏夹 {{ favoriteIds.length }}
        </el-button>
        <el-button :icon="DataLine" :type="compareItems.length >= 2 ? 'primary' : ''" @click="openCompareDrawer">
          {{ compareItems.length >= 2 ? '打开对比' : '选择对比' }} {{ compareItems.length }}
        </el-button>
        <el-button :icon="Download" @click="exportCsv">导出结果</el-button>
        <el-button type="primary" :icon="Plus" @click="openAddDialog">新增经验</el-button>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-card">
        <span class="metric-label">当前结果</span>
        <strong>{{ metrics.totalCount }}</strong>
        <em>条经验</em>
      </div>
      <div class="metric-card">
        <span class="metric-label">复用价值均分</span>
        <strong>{{ metrics.averageScore }}</strong>
        <em>满分 100</em>
      </div>
      <div class="metric-card">
        <span class="metric-label">总浏览 / 采纳</span>
        <strong>{{ metrics.totalViews }} / {{ metrics.totalAdopts }}</strong>
        <em>知识触达与复用</em>
      </div>
      <div class="metric-card danger">
        <span class="metric-label">高风险经验</span>
        <strong>{{ metrics.highRiskCount }}</strong>
        <em>需要重点复盘</em>
      </div>
      <div class="metric-card favorite">
        <span class="metric-label">收藏经验</span>
        <strong>{{ favoriteIds.length }}</strong>
        <em>重点跟进</em>
      </div>
      <div class="metric-card warning">
        <span class="metric-label">待完善</span>
        <strong>{{ incompleteList.length }}</strong>
        <em>内容完整度不足</em>
      </div>
    </section>

    <section class="assistant-grid">
      <el-card class="assistant-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>待完善清单</span>
            <el-tag type="warning" effect="plain">{{ incompleteList.length }} 条</el-tag>
          </div>
        </template>
        <div v-if="incompleteList.length" class="mini-list">
          <button
            v-for="item in incompleteList.slice(0, 5)"
            :key="item.id"
            class="mini-item"
            @click="openEditDialog(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>完整度 {{ completionPercent(item) }}% · {{ missingFields(item).join('、') }}</span>
          </button>
        </div>
        <el-empty v-else description="当前结果内容完整" />
      </el-card>

      <el-card class="assistant-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>最近浏览</span>
            <el-tag type="info" effect="plain">{{ recentViews.length }} 条</el-tag>
          </div>
        </template>
        <div v-if="recentViews.length" class="mini-list">
          <button
            v-for="item in recentViews"
            :key="item.id"
            class="mini-item"
            @click="handleDetail(item)"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }}</span>
          </button>
        </div>
        <el-empty v-else description="暂无浏览记录" />
      </el-card>

      <el-card class="assistant-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>最近留痕</span>
            <el-tag type="success" effect="plain">{{ recentOperationList.length }} 条</el-tag>
          </div>
        </template>
        <div v-if="recentOperationList.length" class="mini-list">
          <div v-for="item in recentOperationList.slice(0, 5)" :key="item.id" class="mini-item audit-mini-item">
            <div class="audit-line">
              <el-tag size="small" :type="operationTagType(item.operationType)" effect="light">
                {{ operationTypeLabel(item.operationType) }}
              </el-tag>
              <strong>{{ item.operatorName || '未记录用户' }}</strong>
            </div>
            <span>{{ operationTargetTitle(item) }} · {{ formatDate(item.createTime) }}</span>
            <p>{{ item.operationContent || '暂无操作说明' }}</p>
          </div>
        </div>
        <el-empty v-else description="暂无工作留痕" />
      </el-card>
    </section>

    <el-card class="filter-card" shadow="never">
      <div class="filter-grid">
        <el-input
          v-model="keyword"
          placeholder="搜索标题、问题、方案、标签"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select v-model="projectName" placeholder="项目名称" clearable filterable>
          <el-option
            v-for="item in filterOptions.projectNames"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>

        <el-select v-model="problemType" placeholder="问题类型" clearable filterable>
          <el-option
            v-for="item in filterOptions.problemTypes"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>

        <el-select v-model="riskLevel" placeholder="风险等级" clearable>
          <el-option
            v-for="item in riskLevelOptions"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>

        <el-select v-model="tag" placeholder="经验标签" clearable filterable>
          <el-option
            v-for="item in filterOptions.tags"
            :key="item"
            :label="item"
            :value="item"
          />
        </el-select>

        <el-select v-model="sortBy" placeholder="排序方式">
          <el-option
            v-for="item in sortOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </div>

      <div class="filter-footer">
        <div class="active-filter-list">
          <el-tag
            v-for="item in activeFilters"
            :key="item.label"
            closable
            effect="plain"
            @close="clearActiveFilter(item)"
          >
            {{ item.label }}
          </el-tag>
        </div>
        <div class="filter-actions">
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        </div>
      </div>
    </el-card>

    <el-card class="list-card" shadow="never">
      <template #header>
        <div class="list-header">
          <div>
            <span class="section-title">经验库</span>
            <span class="section-subtitle">{{ visibleTableData.length }} 条</span>
          </div>
          <el-button :icon="MagicStick" @click="openAddDialog">沉淀新经验</el-button>
        </div>
      </template>

      <el-table :data="visibleTableData" border style="width: 100%" v-loading="loading">
        <el-table-column label="序号" width="70" align="center">
          <template #default="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="关注" width="84" align="center">
          <template #default="{ row }">
            <el-button
              circle
              link
              :type="isFavorite(row) ? 'warning' : 'info'"
              :icon="isFavorite(row) ? StarFilled : Star"
              @click="toggleFavorite(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="对比" width="84" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="isInCompare(row)"
              :disabled="!isInCompare(row) && compareItems.length >= 4"
              @change="toggleCompare(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="经验信息" min-width="320">
          <template #default="{ row }">
            <div class="experience-cell">
              <button class="title-button" @click="handleDetail(row)">{{ row.title }}</button>
              <div class="cell-meta">
                <span>{{ row.projectName || '未填写项目' }}</span>
                <span>{{ row.projectCode || '未填编号' }}</span>
                <span>{{ row.industry || '综合' }}</span>
                <span>{{ row.projectType || '咨询服务' }}</span>
              </div>
              <div class="tag-list">
                <el-tag
                  v-for="item in splitTags(row.tags).slice(0, 4)"
                  :key="item"
                  size="small"
                  effect="plain"
                >
                  {{ item }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="问题画像" min-width="180">
          <template #default="{ row }">
            <div class="stacked-tags">
              <el-tag type="info" effect="plain">{{ row.problemType || '综合管理' }}</el-tag>
              <el-tag :type="riskTagType(row.riskLevel)" effect="light">
                {{ row.riskLevel || '低' }}风险
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="复用价值" width="150" align="center">
          <template #default="{ row }">
            <el-progress
              type="dashboard"
              :width="74"
              :percentage="normalizeScore(row.referenceValueScore)"
              :status="scoreStatus(row.referenceValueScore)"
            />
          </template>
        </el-table-column>

        <el-table-column label="完整度" width="120" align="center">
          <template #default="{ row }">
            <el-progress :percentage="completionPercent(row)" :stroke-width="8" />
          </template>
        </el-table-column>

        <el-table-column label="触达 / 采纳" width="130" align="center">
          <template #default="{ row }">
            <div class="count-pair">
              <span>{{ row.viewCount || 0 }}</span>
              <i>/</i>
              <span>{{ row.adoptCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="creatorName" label="创建人" width="110" />
        <el-table-column prop="updaterName" label="修改人" width="110" />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.updateTime) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div class="action-row">
              <el-tooltip content="查看详情与复用建议">
                <el-button :icon="View" type="primary" link @click="handleDetail(row)">查看</el-button>
              </el-tooltip>
              <el-tooltip content="记录采纳意见">
                <el-button :icon="Check" type="success" link @click="openAdoptDialog(row)">采纳</el-button>
              </el-tooltip>
              <el-tooltip content="编辑经验内容">
                <el-button :icon="Edit" type="warning" link @click="openEditDialog(row)">编辑</el-button>
              </el-tooltip>
              <el-dropdown trigger="click">
                <el-button link>更多</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="toggleCompare(row)">
                      {{ isInCompare(row) ? '移出对比' : '加入对比' }}
                    </el-dropdown-item>
                    <el-dropdown-item @click="copyRowReport(row)">复制报告</el-dropdown-item>
                    <el-dropdown-item @click="handleRecord(row)">修改记录</el-dropdown-item>
                    <el-dropdown-item @click="handleAdoptRecord(row)">采纳记录</el-dropdown-item>
                    <el-dropdown-item divided @click="handleDelete(row)">
                      <span class="danger-text">删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="经验详情" width="1100px" destroy-on-close>
      <div v-if="detailData" class="detail-layout">
        <section class="detail-main">
          <div class="detail-heading">
            <div>
              <h3>{{ detailData.title }}</h3>
              <div class="detail-meta">
                <span>{{ detailData.projectName }}</span>
                <span>{{ detailData.projectCode || '未填写编号' }}</span>
                <span>{{ detailData.problemType || '综合管理' }}</span>
                <span>{{ formatDate(detailData.updateTime) }}</span>
              </div>
            </div>
            <el-tag :type="riskTagType(detailData.riskLevel)" size="large">
              {{ detailData.riskLevel || '低' }}风险
            </el-tag>
          </div>

          <div class="detail-tags">
            <el-tag v-for="item in splitTags(detailData.tags)" :key="item" effect="plain">
              {{ item }}
            </el-tag>
          </div>

          <el-tabs model-value="content" class="detail-tabs">
            <el-tab-pane label="完整内容" name="content">
              <div class="content-grid">
                <div v-for="item in detailBlocks" :key="item.label" class="content-block">
                  <span>{{ item.label }}</span>
                  <p>{{ item.value || '暂无内容' }}</p>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="复用行动" name="action">
              <div class="tab-toolbar">
                <span>行动清单</span>
                <el-button :icon="DocumentCopy" @click="copyActionPlan">复制清单</el-button>
              </div>
              <ol class="action-plan">
                <li v-for="item in actionPlanList" :key="item">{{ item }}</li>
              </ol>
            </el-tab-pane>

            <el-tab-pane label="相似推荐" name="recommend">
              <div v-if="recommendList.length" class="recommend-list">
                <button
                  v-for="item in recommendList"
                  :key="item.id"
                  class="recommend-item"
                  @click="handleDetail(item)"
                >
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.projectName }} · {{ item.problemType || '综合管理' }}</span>
                </button>
              </div>
              <el-empty v-else description="暂无相似经验" />
            </el-tab-pane>

            <el-tab-pane label="复用报告" name="report">
              <div class="tab-toolbar">
                <span>复用报告预览</span>
                <el-button :icon="DocumentCopy" @click="copyReuseReport">复制报告</el-button>
              </div>
              <div class="reuse-report-card">
                <div class="reuse-report-hero">
                  <div>
                    <span class="report-kicker">经验复用报告</span>
                    <h4>{{ detailData.title || '未命名经验' }}</h4>
                    <p>{{ detailData.summary || '暂无经验总结，建议补充结论后再沉淀到复用报告。' }}</p>
                  </div>
                  <div class="report-score">
                    <strong>{{ normalizeScore(detailData.referenceValueScore) }}</strong>
                    <span>复用价值</span>
                  </div>
                </div>

                <div class="report-meta-grid">
                  <div>
                    <span>项目</span>
                    <strong>{{ detailData.projectName || '未填写项目' }}</strong>
                  </div>
                  <div>
                    <span>项目编号</span>
                    <strong>{{ detailData.projectCode || '未填写编号' }}</strong>
                  </div>
                  <div>
                    <span>问题类型</span>
                    <strong>{{ detailData.problemType || '综合管理' }}</strong>
                  </div>
                  <div>
                    <span>风险等级</span>
                    <strong>{{ detailData.riskLevel || '低' }}</strong>
                  </div>
                  <div>
                    <span>触达 / 采纳</span>
                    <strong>{{ detailData.viewCount || 0 }} / {{ detailData.adoptCount || 0 }}</strong>
                  </div>
                </div>

                <div class="report-tag-row">
                  <el-tag v-for="item in splitTags(detailData.tags)" :key="item" effect="plain">{{ item }}</el-tag>
                  <el-tag v-if="!splitTags(detailData.tags).length" type="info" effect="plain">暂无标签</el-tag>
                </div>

                <div class="report-section-grid">
                  <article class="report-section">
                    <span>问题与原因</span>
                    <p>{{ detailData.problemDesc || '暂无问题描述' }}</p>
                    <p>{{ detailData.reasonAnalysis || '暂无原因分析' }}</p>
                  </article>
                  <article class="report-section">
                    <span>解决方案</span>
                    <p>{{ detailData.solution || '暂无解决方案' }}</p>
                  </article>
                  <article class="report-section">
                    <span>复用场景</span>
                    <p>{{ detailData.reuseScenario || '暂无复用场景' }}</p>
                  </article>
                  <article class="report-section">
                    <span>个人笔记</span>
                    <p>{{ reportNote }}</p>
                  </article>
                </div>

                <article class="report-section full">
                  <span>复用行动清单</span>
                  <ol class="report-action-list">
                    <li v-for="item in reportActionItems" :key="item">{{ item }}</li>
                  </ol>
                </article>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>

        <aside class="detail-side">
          <div class="side-section">
            <span class="side-label">复用价值</span>
            <el-progress
              type="dashboard"
              :width="116"
              :percentage="normalizeScore(detailData.referenceValueScore)"
              :status="scoreStatus(detailData.referenceValueScore)"
            />
          </div>

          <div class="side-section">
            <span class="side-label">内容完整度</span>
            <el-progress :percentage="completionPercent(detailData)" :stroke-width="8" />
          </div>

          <div class="side-section">
            <span class="side-label">工作留痕</span>
            <div v-if="detailRecordList.length" class="trail-list compact">
              <div v-for="item in detailRecordList.slice(0, 4)" :key="item.id" class="trail-item">
                <div class="trail-head">
                  <el-tag size="small" :type="operationTagType(item.operationType)" effect="light">
                    {{ operationTypeLabel(item.operationType) }}
                  </el-tag>
                  <strong>{{ item.operatorName || '未记录用户' }}</strong>
                </div>
                <span>{{ formatDate(item.createTime) }}</span>
                <p>{{ item.operationContent || '暂无操作说明' }}</p>
              </div>
            </div>
            <el-empty v-else description="暂无留痕" :image-size="56" />
            <el-button class="note-save" :icon="Notebook" @click="handleRecord(detailData)">查看完整留痕</el-button>
          </div>

          <div class="side-metrics">
            <div>
              <strong>{{ detailData.viewCount || 0 }}</strong>
              <span>浏览</span>
            </div>
            <div>
              <strong>{{ detailData.adoptCount || 0 }}</strong>
              <span>采纳</span>
            </div>
          </div>

          <div class="side-section">
            <span class="side-label">可复用场景</span>
            <p>{{ detailData.reuseScenario || '暂无复用场景' }}</p>
          </div>

          <div class="side-section">
            <span class="side-label">个人笔记</span>
            <el-input
              v-model="currentNote"
              type="textarea"
              :rows="4"
              placeholder="记录你对这条经验的复用想法"
              @blur="saveCurrentNote"
            />
            <el-button class="note-save" :icon="Notebook" @click="saveCurrentNote">保存笔记</el-button>
          </div>

          <div class="side-actions">
            <el-button :type="isFavorite(detailData) ? 'warning' : ''" :icon="isFavorite(detailData) ? StarFilled : Star" @click="toggleFavorite(detailData)">
              {{ isFavorite(detailData) ? '取消收藏' : '收藏经验' }}
            </el-button>
            <el-button :icon="DataLine" @click="toggleCompare(detailData)">
              {{ isInCompare(detailData) ? '移出对比' : '加入对比' }}
            </el-button>
            <el-button type="success" :icon="Check" @click="openAdoptDialog(detailData)">采纳经验</el-button>
            <el-button :icon="Edit" @click="openEditDialog(detailData)">编辑经验</el-button>
          </div>
        </aside>
      </div>
    </el-dialog>

    <el-dialog v-model="recordVisible" title="工作留痕" width="960px">
      <div class="record-summary">
        <div>
          <span>留痕总数</span>
          <strong>{{ recordTableData.length }}</strong>
        </div>
        <div>
          <span>参与人员</span>
          <strong>{{ recordOperatorCount }}</strong>
        </div>
        <div>
          <span>最近操作</span>
          <strong>{{ recordTableData[0] ? operationTypeLabel(recordTableData[0].operationType) : '-' }}</strong>
        </div>
      </div>

      <el-timeline v-if="recordTableData.length" class="record-timeline">
        <el-timeline-item
          v-for="item in recordTableData"
          :key="item.id"
          :timestamp="formatDate(item.createTime)"
          placement="top"
        >
          <div class="record-card">
            <div class="trail-head">
              <el-tag :type="operationTagType(item.operationType)" effect="light">
                {{ operationTypeLabel(item.operationType) }}
              </el-tag>
              <strong>{{ item.operatorName || '未记录用户' }}</strong>
            </div>
            <p>{{ item.operationContent || '暂无操作说明' }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无工作留痕" />
    </el-dialog>

    <el-dialog v-model="adoptRecordVisible" title="采纳记录" width="900px">
      <el-table :data="adoptRecordTableData" border style="width: 100%">
        <el-table-column prop="id" label="记录ID" width="110" />
        <el-table-column prop="adopterName" label="采纳人" width="120" />
        <el-table-column prop="adoptComment" label="采纳说明" min-width="420" show-overflow-tooltip />
        <el-table-column label="采纳时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="formVisible" :title="formTitle" width="960px" destroy-on-close>
      <el-form :model="formData" :rules="formRules" ref="formRef" label-width="110px">
        <div class="form-section-title with-action">
          <span>基础信息</span>
          <el-button :icon="Tickets" @click="templateVisible = true">套用模板</el-button>
        </div>
        <div class="form-grid">
          <el-form-item label="经验标题" prop="title">
            <el-input v-model="formData.title" placeholder="请输入经验标题" />
          </el-form-item>

          <el-form-item label="项目名称" prop="projectName">
            <el-input v-model="formData.projectName" placeholder="请输入项目名称" />
          </el-form-item>

          <el-form-item label="项目编号">
            <el-input v-model="formData.projectCode" placeholder="请输入项目编号" />
          </el-form-item>

          <el-form-item label="项目类型">
            <el-input v-model="formData.projectType" placeholder="如：咨询服务、系统建设" />
          </el-form-item>

          <el-form-item label="行业领域">
            <el-input v-model="formData.industry" placeholder="如：政务、制造、金融" />
          </el-form-item>

          <el-form-item v-if="formMode === 'add'" label="创建人">
            <div class="operator-field">
              <el-input :model-value="currentOperatorName" disabled />
              <span>{{ operatorHint }}</span>
            </div>
          </el-form-item>

          <el-form-item v-else label="本次修改人">
            <div class="operator-field">
              <el-input :model-value="currentOperatorName" disabled />
              <span>{{ operatorHint }}</span>
            </div>
          </el-form-item>
        </div>

        <div class="form-section-title with-action">
          <span>智能画像</span>
          <el-button
            type="primary"
            plain
            :icon="MagicStick"
            :loading="analyzing"
            @click="runAnalysis"
          >
            智能分析补全
          </el-button>
        </div>

        <div class="form-grid">
          <el-form-item label="问题类型">
            <el-input v-model="formData.problemType" placeholder="可由智能分析自动补全" />
          </el-form-item>

          <el-form-item label="风险等级">
            <el-select v-model="formData.riskLevel" placeholder="请选择风险等级" clearable>
              <el-option v-for="item in riskLevelOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>

          <el-form-item label="经验标签">
            <el-input v-model="formData.tags" placeholder="多个标签用逗号分隔" />
          </el-form-item>

          <el-form-item label="价值评分">
            <el-input-number
              v-model="formData.referenceValueScore"
              :min="0"
              :max="100"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <el-form-item label="复用场景">
          <el-input
            v-model="formData.reuseScenario"
            type="textarea"
            :rows="2"
            placeholder="说明哪些项目、阶段或角色可复用这条经验"
          />
        </el-form-item>

        <div v-if="analysisResult" class="analysis-panel">
          <div>
            <strong>分析建议</strong>
            <p>{{ analysisResult.summarySuggestion }}</p>
          </div>
          <el-button :icon="Check" @click="applyAnalysisResult">应用建议</el-button>
          <ul>
            <li v-for="item in analysisResult.improveSuggestionList" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="form-section-title">经验内容</div>
        <el-form-item label="场景描述" prop="sceneDesc">
          <el-input v-model="formData.sceneDesc" type="textarea" :rows="2" placeholder="请输入场景描述" />
        </el-form-item>

        <el-form-item label="问题描述" prop="problemDesc">
          <el-input v-model="formData.problemDesc" type="textarea" :rows="2" placeholder="请输入问题描述" />
        </el-form-item>

        <el-form-item label="原因分析" prop="reasonAnalysis">
          <el-input v-model="formData.reasonAnalysis" type="textarea" :rows="2" placeholder="请输入原因分析" />
        </el-form-item>

        <el-form-item label="解决方案" prop="solution">
          <el-input v-model="formData.solution" type="textarea" :rows="2" placeholder="请输入解决方案" />
        </el-form-item>

        <el-form-item label="经验总结" prop="summary">
          <el-input v-model="formData.summary" type="textarea" :rows="2" placeholder="请输入经验总结" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">{{ formMode === 'add' ? '提交新增审核' : '提交修改审核' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="adoptVisible" title="采纳意见" width="620px">
      <el-form :model="adoptFormData" :rules="adoptRules" ref="adoptFormRef" label-width="100px">
        <el-form-item label="采纳人">
          <div class="operator-field">
            <el-input :model-value="currentOperatorName" disabled />
            <span>{{ operatorHint }}</span>
          </div>
        </el-form-item>

        <el-form-item label="采纳说明" prop="adoptComment">
          <el-input
            v-model="adoptFormData.adoptComment"
            type="textarea"
            :rows="4"
            placeholder="请输入采纳说明"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="adoptVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdopt">提交采纳审核</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateVisible" title="经验写作模板" width="1040px">
      <div class="template-toolbar">
        <div>
          <strong>模板库</strong>
          <span>内置模板 + 你自己新增的模板都会显示在这里</span>
        </div>
        <div>
          <el-button :icon="Plus" @click="openTemplateCreate">新增模板</el-button>
          <el-button :icon="DocumentCopy" @click="saveCurrentAsTemplate">保存当前表单为模板</el-button>
        </div>
      </div>
      <div class="template-grid">
        <div v-for="item in experienceTemplates" :key="item.id || item.name" class="template-card">
          <div>
            <div class="template-title-row">
              <strong>{{ item.name }}</strong>
              <el-tag v-if="item.custom" type="success" size="small" effect="plain">自定义</el-tag>
            </div>
            <p>{{ item.desc }}</p>
          </div>
          <div class="template-tags">
            <el-tag v-for="tagItem in splitTags(item.data.tags)" :key="tagItem" size="small" effect="plain">
              {{ tagItem }}
            </el-tag>
          </div>
          <div class="template-actions">
            <el-button type="primary" plain @click="applyTemplate(item)">套用模板</el-button>
            <el-button v-if="item.custom" type="danger" plain @click="deleteCustomTemplate(item)">删除</el-button>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="templateFormVisible" title="新增自定义模板" width="760px">
      <el-form :model="templateForm" label-width="96px">
        <el-form-item label="模板名称">
          <el-input v-model="templateForm.name" placeholder="如：上线风险复盘模板" />
        </el-form-item>
        <el-form-item label="模板说明">
          <el-input v-model="templateForm.desc" placeholder="说明这个模板适合什么场景" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="问题类型">
            <el-input v-model="templateForm.data.problemType" />
          </el-form-item>
          <el-form-item label="风险等级">
            <el-select v-model="templateForm.data.riskLevel">
              <el-option v-for="item in riskLevelOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="标签">
          <el-input v-model="templateForm.data.tags" placeholder="多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="复用场景">
          <el-input v-model="templateForm.data.reuseScenario" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="场景描述">
          <el-input v-model="templateForm.data.sceneDesc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="问题描述">
          <el-input v-model="templateForm.data.problemDesc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="原因分析">
          <el-input v-model="templateForm.data.reasonAnalysis" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="解决方案">
          <el-input v-model="templateForm.data.solution" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="经验总结">
          <el-input v-model="templateForm.data.summary" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="templateFormVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomTemplate">保存模板</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="myApprovalVisible" title="我的审核" size="72%" @open="loadMyApprovals">
      <div class="approval-toolbar">
        <div class="approval-stat-row">
          <span>待审核 {{ myApprovalStats.pending }}</span>
          <span>已通过 {{ myApprovalStats.approved }}</span>
          <span>已驳回 {{ myApprovalStats.rejected }}</span>
        </div>
        <div class="approval-toolbar-actions">
          <el-radio-group v-model="myApprovalStatus">
            <el-radio-button label="ALL">全部</el-radio-button>
            <el-radio-button label="PENDING">待审核</el-radio-button>
            <el-radio-button label="APPROVED">已通过</el-radio-button>
            <el-radio-button label="REJECTED">已驳回</el-radio-button>
          </el-radio-group>
          <el-button :icon="Refresh" @click="loadMyApprovals">刷新</el-button>
        </div>
      </div>

      <el-table :data="filteredMyApprovalList" border style="width: 100%" v-loading="myApprovalLoading">
        <el-table-column label="操作" width="110">
          <template #default="{ row }">
            <el-tag :type="operationTagType(row.actionType)" effect="light">
              {{ operationTypeLabel(row.actionType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="经验对象" min-width="200">
          <template #default="{ row }">
            {{ approvalTargetTitle(row) }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="approvalStatusTagType(row.status)" effect="plain">
              {{ approvalStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请摘要" min-width="280">
          <template #default="{ row }">
            <span class="summary-text">{{ approvalSummary(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="审核意见" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.reviewComment || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="审核时间" width="170">
          <template #default="{ row }">{{ formatDate(row.reviewTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="canRetryApproval(row)"
              link
              type="primary"
              @click="handleRetryApproval(row)"
            >
              {{ approvalRetryLabel(row) }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-drawer v-model="compareVisible" title="经验对比" size="72%">
      <div class="compare-toolbar">
        <span>已选择 {{ compareItems.length }} 条经验</span>
        <div>
          <el-button :icon="DocumentCopy" @click="copyCompareReport">复制对比</el-button>
          <el-button type="danger" plain @click="clearCompare">清空对比</el-button>
        </div>
      </div>

      <div v-if="compareItems.length" class="compare-selected-list">
        <div v-for="item in compareItems" :key="item.id" class="compare-selected-item">
          <span>{{ item.title }}</span>
          <el-button link type="danger" @click="removeCompare(item)">移出</el-button>
        </div>
      </div>

      <el-alert
        v-if="compareItems.length < 2"
        title="至少选择 2 条经验后即可生成横向对比。你可以在列表勾选，也可以从下方快捷加入。"
        type="info"
        show-icon
        :closable="false"
      />

      <div v-if="compareItems.length < 2" class="compare-candidate-grid">
        <div v-for="item in compareCandidates" :key="item.id" class="compare-candidate-card">
          <strong>{{ item.title }}</strong>
          <p>{{ item.projectName || '未填写项目' }} · {{ item.problemType || '综合管理' }}</p>
          <el-button size="small" type="primary" plain @click="toggleCompare(item)">加入对比</el-button>
        </div>
      </div>

      <el-table v-if="compareItems.length >= 2" :data="compareRows" border style="width: 100%">
        <el-table-column prop="label" label="对比项" width="140" fixed />
        <el-table-column
          v-for="item in compareItems"
          :key="item.id"
          :label="item.title"
          min-width="220"
        >
          <template #default="{ row }">
            <span class="compare-cell">{{ row.values[item.id] || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check,
  DataLine,
  DocumentCopy,
  Download,
  Edit,
  MagicStick,
  Notebook,
  Plus,
  Refresh,
  Search,
  Star,
  StarFilled,
  Tickets,
  View,
} from '@element-plus/icons-vue'
import {
  getExperienceList,
  getFilterOptions,
  getExperienceById,
  getExperienceDetail,
  getExperienceRecordList,
  getRecentOperationRecordList,
  getExperienceAdoptRecordList,
  getCurrentFeishuUser,
  getMyApprovalList,
  addExperience,
  updateExperience,
  analyzeExperience,
  getReuseRecommendList,
  getActionPlan,
  adoptExperience,
  deleteExperience,
} from '../api/experience'

const STORAGE_KEYS = {
  favorites: 'experience_favorite_ids',
  compare: 'experience_compare_items',
  notes: 'experience_personal_notes',
  recent: 'experience_recent_views',
  templates: 'experience_custom_templates',
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

const loading = ref(false)
const tableData = ref([])
const currentUser = ref(readStorage('feishu_user', {}))
const feishuSessionToken = ref(window.localStorage.getItem('feishu_session_token') || '')

const keyword = ref('')
const projectName = ref('')
const problemType = ref('')
const riskLevel = ref('')
const tag = ref('')
const sortBy = ref('')

const filterOptions = ref({
  projectNames: [],
  problemTypes: [],
  riskLevels: [],
  tags: [],
})

const riskLevelOptions = ['低', '中', '高']
const sortOptions = [
  { label: '默认排序', value: '' },
  { label: '最近更新', value: 'recent' },
  { label: '浏览最多', value: 'view' },
  { label: '采纳最多', value: 'adopt' },
  { label: '复用价值最高', value: 'score' },
]

const favoriteOnly = ref(false)
const favoriteIds = ref(readStorage(STORAGE_KEYS.favorites, []))
const compareItems = ref(readStorage(STORAGE_KEYS.compare, []))
const recentViews = ref(readStorage(STORAGE_KEYS.recent, []))
const noteMap = ref(readStorage(STORAGE_KEYS.notes, {}))
const currentNote = ref('')
const templateVisible = ref(false)
const templateFormVisible = ref(false)
const compareVisible = ref(false)

const builtInTemplates = [
  {
    name: '需求变更复盘',
    desc: '适合记录需求范围、变更评审、客户确认和延期预防。',
    data: {
      problemType: '需求管理',
      riskLevel: '高',
      tags: '需求管理,变更控制,客户确认,项目复盘',
      reuseScenario: '适用于项目前期需求调研、范围确认、需求变更评审和阶段复盘场景。',
      referenceValueScore: 82,
      sceneDesc: '项目推进过程中，客户在关键节点提出新增或调整需求。',
      problemDesc: '需求边界不清晰导致计划被反复打断，交付范围、排期和资源安排受到影响。',
      reasonAnalysis: '前期需求确认不充分，变更入口和评审机制缺失，口头沟通没有形成书面闭环。',
      solution: '建立需求基线，统一变更申请、影响评估、负责人确认和版本记录；重大变更纳入里程碑评审。',
      summary: '需求变更必须可记录、可评估、可确认，先控制入口，再评估影响，最后同步计划。',
    },
  },
  {
    name: '上线故障复盘',
    desc: '适合沉淀系统发布、接口联调、数据迁移和紧急故障处理。',
    data: {
      problemType: '技术实现',
      riskLevel: '高',
      tags: '上线发布,故障复盘,接口联调,风险预警',
      reuseScenario: '适用于系统上线、接口联调、生产故障、数据处理和异常排查场景。',
      referenceValueScore: 88,
      sceneDesc: '系统上线或版本发布后，生产环境出现异常、性能波动或接口不可用。',
      problemDesc: '用户业务操作受阻，相关团队需要快速定位问题并恢复服务。',
      reasonAnalysis: '发布前验证覆盖不足，环境差异、接口依赖、回滚方案或监控告警准备不充分。',
      solution: '按影响范围分级响应，先恢复服务，再定位根因；补充发布清单、回滚预案和监控指标。',
      summary: '上线不是代码提交的终点，必须把验证清单、监控告警、回滚方案和责任人一起准备好。',
    },
  },
  {
    name: '客户沟通闭环',
    desc: '适合记录跨部门协同、客户确认、会议纪要和问题闭环。',
    data: {
      problemType: '沟通协同',
      riskLevel: '中',
      tags: '客户沟通,会议纪要,协同闭环,责任分工',
      reuseScenario: '适用于跨部门协同、客户沟通确认、问题闭环跟踪和会议纪要复盘场景。',
      referenceValueScore: 76,
      sceneDesc: '多方参与的项目推进中，客户、业务、产品、开发对同一事项理解不一致。',
      problemDesc: '口径不统一导致任务反复确认，部分事项遗漏或责任人不清晰。',
      reasonAnalysis: '会议结论没有及时固化，待办缺少负责人、截止时间和确认机制。',
      solution: '会议后同步纪要，明确事项、责任人、截止时间、确认人和风险；关键结论二次确认。',
      summary: '跨团队沟通要把“说过”变成“确认过”，把“有人跟”变成“谁在何时完成”。',
    },
  },
  {
    name: '质量返工复盘',
    desc: '适合沉淀交付物评审、测试验收、返工整改和质量提升。',
    data: {
      problemType: '质量管理',
      riskLevel: '中',
      tags: '质量提升,交付评审,返工整改,验收标准',
      reuseScenario: '适用于交付物评审、测试验收、问题整改和质量复盘场景。',
      referenceValueScore: 78,
      sceneDesc: '项目交付或验收阶段发现文档、功能、数据或流程不符合预期。',
      problemDesc: '返工次数增加，验收周期被拉长，客户对交付质量产生疑虑。',
      reasonAnalysis: '质量标准前置不足，过程评审不充分，验收口径和交付检查项不够明确。',
      solution: '建立交付检查清单，关键节点做同行评审和客户预验收；问题整改记录到闭环台账。',
      summary: '质量问题要前置拦截，交付前用检查清单和评审机制把返工风险压下去。',
    },
  },
]

const createEmptyTemplateForm = () => ({
  id: null,
  name: '',
  desc: '',
  custom: true,
  data: {
    problemType: '',
    riskLevel: '中',
    tags: '',
    reuseScenario: '',
    referenceValueScore: 80,
    sceneDesc: '',
    problemDesc: '',
    reasonAnalysis: '',
    solution: '',
    summary: '',
  },
})

const customTemplates = ref(readStorage(STORAGE_KEYS.templates, []))
const templateForm = ref(createEmptyTemplateForm())

const experienceTemplates = computed(() => [
  ...builtInTemplates.map((item) => ({ ...item, custom: false })),
  ...customTemplates.value,
])

const detailVisible = ref(false)
const detailData = ref(null)
const recommendList = ref([])
const actionPlanList = ref([])

const reportActionItems = computed(() => {
  if (!detailData.value) return []
  return actionPlanList.value.length ? actionPlanList.value : ['进入经验详情后可生成复用行动清单']
})

const reportNote = computed(() => {
  if (!detailData.value) return '暂无个人笔记'
  return noteMap.value[String(detailData.value.id)] || currentNote.value || '暂无个人笔记'
})

const recordVisible = ref(false)
const recordTableData = ref([])
const detailRecordList = ref([])
const recentOperationList = ref([])

const adoptRecordVisible = ref(false)
const adoptRecordTableData = ref([])

const formVisible = ref(false)
const formMode = ref('add')
const formRef = ref()
const formData = ref(createEmptyForm())
const analysisResult = ref(null)
const analyzing = ref(false)

const adoptVisible = ref(false)
const adoptFormRef = ref()
const adoptFormData = ref({
  experienceId: null,
  adopterName: '',
  adoptComment: '',
})

const myApprovalVisible = ref(false)
const myApprovalLoading = ref(false)
const myApprovalStatus = ref('ALL')
const myApprovalList = ref([])

const formTitle = computed(() => (formMode.value === 'add' ? '新增经验' : '编辑经验'))
const operatorReady = computed(() => !!feishuSessionToken.value && !!currentUser.value?.name)
const currentOperatorName = computed(() => (operatorReady.value ? currentUser.value.name : '未识别身份'))
const operatorHint = computed(() => (
  operatorReady.value
    ? '飞书免登身份，管理员审核通过后自动记录到工作留痕。'
    : '未识别到飞书身份，请从飞书工作台入口进入或重新进行飞书免登。'
))

const formRules = {
  title: [{ required: true, message: '请输入经验标题', trigger: 'blur' }],
  projectName: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  problemDesc: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
  summary: [{ required: true, message: '请输入经验总结', trigger: 'blur' }],
}

const adoptRules = {
  adoptComment: [{ required: true, message: '请输入采纳说明', trigger: 'blur' }],
}

const operationMeta = {
  CREATE: { label: '新增经验', type: 'success' },
  UPDATE: { label: '修改经验', type: 'warning' },
  ADOPT: { label: '采纳经验', type: 'success' },
  DELETE: { label: '删除经验', type: 'danger' },
}

const approvalStatusMeta = {
  PENDING: { label: '待审核', type: 'warning' },
  APPROVED: { label: '已通过', type: 'success' },
  REJECTED: { label: '已驳回', type: 'danger' },
}

const recordOperatorCount = computed(() => {
  return new Set(recordTableData.value.map((item) => item.operatorName).filter(Boolean)).size
})

const visibleTableData = computed(() => {
  if (!favoriteOnly.value) {
    return tableData.value
  }
  return tableData.value.filter((item) => isFavorite(item))
})

const filteredMyApprovalList = computed(() => {
  if (myApprovalStatus.value === 'ALL') {
    return myApprovalList.value
  }
  return myApprovalList.value.filter((item) => item.status === myApprovalStatus.value)
})

const myApprovalStats = computed(() => ({
  pending: myApprovalList.value.filter((item) => item.status === 'PENDING').length,
  approved: myApprovalList.value.filter((item) => item.status === 'APPROVED').length,
  rejected: myApprovalList.value.filter((item) => item.status === 'REJECTED').length,
}))

const myApprovalAttentionCount = computed(() => myApprovalStats.value.pending + myApprovalStats.value.rejected)

const metrics = computed(() => {
  const list = visibleTableData.value
  const totalViews = list.reduce((sum, item) => sum + Number(item.viewCount || 0), 0)
  const totalAdopts = list.reduce((sum, item) => sum + Number(item.adoptCount || 0), 0)
  const scoreSum = list.reduce((sum, item) => sum + normalizeScore(item.referenceValueScore), 0)
  const averageScore = list.length ? Math.round(scoreSum / list.length) : 0
  const highRiskCount = list.filter((item) => item.riskLevel === '高').length

  return {
    totalCount: list.length,
    totalViews,
    totalAdopts,
    averageScore,
    highRiskCount,
  }
})

const incompleteList = computed(() => {
  return visibleTableData.value
    .filter((item) => completionPercent(item) < 75)
    .sort((a, b) => completionPercent(a) - completionPercent(b))
})

const activeFilters = computed(() => {
  const items = []
  if (keyword.value) items.push({ label: `关键词：${keyword.value}`, clear: () => (keyword.value = '') })
  if (projectName.value) items.push({ label: `项目：${projectName.value}`, clear: () => (projectName.value = '') })
  if (problemType.value) items.push({ label: `类型：${problemType.value}`, clear: () => (problemType.value = '') })
  if (riskLevel.value) items.push({ label: `风险：${riskLevel.value}`, clear: () => (riskLevel.value = '') })
  if (tag.value) items.push({ label: `标签：${tag.value}`, clear: () => (tag.value = '') })
  if (favoriteOnly.value) items.push({ label: '只看收藏', clear: () => (favoriteOnly.value = false) })
  return items
})

const detailBlocks = computed(() => {
  const data = detailData.value || {}
  return [
    { label: '场景描述', value: data.sceneDesc },
    { label: '问题描述', value: data.problemDesc },
    { label: '原因分析', value: data.reasonAnalysis },
    { label: '解决方案', value: data.solution },
    { label: '经验总结', value: data.summary },
  ]
})

const compareFields = [
  { label: '项目名称', field: 'projectName' },
  { label: '项目编号', field: 'projectCode' },
  { label: '问题类型', field: 'problemType' },
  { label: '风险等级', field: 'riskLevel' },
  { label: '复用价值', field: 'referenceValueScore', suffix: '分' },
  { label: '浏览量', field: 'viewCount' },
  { label: '采纳次数', field: 'adoptCount' },
  { label: '经验标签', field: 'tags' },
  { label: '可复用场景', field: 'reuseScenario' },
  { label: '问题描述', field: 'problemDesc' },
  { label: '解决方案', field: 'solution' },
  { label: '经验总结', field: 'summary' },
]

const compareRows = computed(() => {
  return compareFields.map((field) => {
    const values = {}
    compareItems.value.forEach((item) => {
      const raw = item[field.field]
      values[item.id] = raw ? `${raw}${field.suffix || ''}` : ''
    })
    return {
      label: field.label,
      values,
    }
  })
})

const compareCandidates = computed(() => {
  return visibleTableData.value
    .filter((item) => !isInCompare(item))
    .slice(0, 6)
})

function createEmptyForm() {
  return {
    id: null,
    title: '',
    projectName: '',
    projectCode: '',
    industry: '',
    projectType: '',
    problemType: '',
    riskLevel: '低',
    tags: '',
    reuseScenario: '',
    referenceValueScore: 0,
    sceneDesc: '',
    problemDesc: '',
    reasonAnalysis: '',
    solution: '',
    summary: '',
    creatorId: 1,
    creatorName: '',
    updaterName: '',
    status: 2,
    viewCount: 0,
    adoptCount: 0,
  }
}

const loadFilterOptions = async () => {
  try {
    const res = await getFilterOptions()
    if (res.data.code === 200) {
      filterOptions.value = {
        projectNames: res.data.data.projectNames || [],
        problemTypes: res.data.data.problemTypes || [],
        riskLevels: res.data.data.riskLevels || [],
        tags: res.data.data.tags || [],
      }
    }
  } catch (error) {
    ElMessage.error('获取筛选项失败')
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getExperienceList({
      keyword: keyword.value,
      projectName: projectName.value,
      problemType: problemType.value,
      riskLevel: riskLevel.value,
      tag: tag.value,
      sortBy: sortBy.value,
    })
    if (res.data.code === 200) {
      tableData.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取数据失败')
    }
  } catch (error) {
    ElMessage.error('请求失败，请检查后端是否启动')
  } finally {
    loading.value = false
  }
}

const loadRecentOperations = async () => {
  try {
    const res = await getRecentOperationRecordList(30)
    if (res.data.code === 200) {
      recentOperationList.value = res.data.data || []
    }
  } catch (error) {
    recentOperationList.value = []
  }
}

const loadMyApprovals = async () => {
  if (!operatorReady.value) {
    myApprovalList.value = []
    return
  }

  myApprovalLoading.value = true
  try {
    const res = await getMyApprovalList('ALL')
    if (res.data.code === 200) {
      myApprovalList.value = res.data.data || []
    } else {
      ElMessage.error(res.data.msg || '获取我的审核失败')
    }
  } catch (error) {
    ElMessage.error('获取我的审核失败，请检查后端接口')
  } finally {
    myApprovalLoading.value = false
  }
}

const refreshCurrentUser = async () => {
  const token = window.localStorage.getItem('feishu_session_token')
  feishuSessionToken.value = token || ''
  if (!token) {
    currentUser.value = {}
    window.localStorage.removeItem('feishu_user')
    return
  }

  try {
    const res = await getCurrentFeishuUser()
    if (res.data.code === 200 && res.data.data) {
      currentUser.value = res.data.data
      writeStorage('feishu_user', res.data.data)
    } else {
      feishuSessionToken.value = ''
      currentUser.value = {}
      window.localStorage.removeItem('feishu_session_token')
      window.localStorage.removeItem('feishu_user')
    }
  } catch (error) {
    feishuSessionToken.value = ''
    currentUser.value = {}
    window.localStorage.removeItem('feishu_session_token')
    window.localStorage.removeItem('feishu_user')
  }
}

const ensureOperatorReady = async () => {
  await refreshCurrentUser()
  if (operatorReady.value) {
    return true
  }
  ElMessage.warning('未识别到飞书身份，请从飞书工作台入口进入后再提交操作')
  return false
}

const openMyApprovalDrawer = async () => {
  if (!(await ensureOperatorReady())) return
  myApprovalVisible.value = true
}

const handleSearch = () => {
  loadData()
}

const handleReset = () => {
  keyword.value = ''
  projectName.value = ''
  problemType.value = ''
  riskLevel.value = ''
  tag.value = ''
  sortBy.value = ''
  loadData()
}

const clearActiveFilter = (item) => {
  item.clear()
  loadData()
}

const handleDetail = async (row) => {
  try {
    const res = await getExperienceDetail(row.id)
    if (res.data.code !== 200) {
      ElMessage.error(res.data.msg || '获取详情失败')
      return
    }

    detailData.value = res.data.data
    currentNote.value = noteMap.value[String(detailData.value.id)] || ''
    detailRecordList.value = []
    detailVisible.value = true
    pushRecentView(detailData.value)
    loadData()

    const [recommendRes, actionRes, recordRes] = await Promise.allSettled([
      getReuseRecommendList(row.id),
      getActionPlan(row.id),
      getExperienceRecordList(row.id),
    ])

    recommendList.value =
      recommendRes.status === 'fulfilled' && recommendRes.value.data.code === 200
        ? recommendRes.value.data.data || []
        : []
    actionPlanList.value =
      actionRes.status === 'fulfilled' && actionRes.value.data.code === 200
        ? actionRes.value.data.data || []
        : []
    detailRecordList.value =
      recordRes.status === 'fulfilled' && recordRes.value.data.code === 200
        ? recordRes.value.data.data || []
        : []
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const handleRecord = async (row) => {
  try {
    const res = await getExperienceRecordList(row.id)
    if (res.data.code === 200) {
      recordTableData.value = res.data.data || []
      if (detailData.value?.id === row.id) {
        detailRecordList.value = recordTableData.value
      }
      recordVisible.value = true
    } else {
      ElMessage.error('获取工作留痕失败')
    }
  } catch (error) {
    ElMessage.error('获取工作留痕失败')
  }
}

const handleAdoptRecord = async (row) => {
  try {
    const res = await getExperienceAdoptRecordList(row.id)
    if (res.data.code === 200) {
      adoptRecordTableData.value = res.data.data || []
      adoptRecordVisible.value = true
    } else {
      ElMessage.error('获取采纳记录失败')
    }
  } catch (error) {
    ElMessage.error('获取采纳记录失败')
  }
}

const handleDelete = async (row) => {
  try {
    if (!(await ensureOperatorReady())) return

    await ElMessageBox.confirm(`确定提交《${row.title}》的删除审核吗？管理员通过后才会删除。`, '提交删除审核', {
      confirmButtonText: '提交审核',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const res = await deleteExperience(row.id)
    if (res.data.code === 200 && res.data.data === true) {
      ElMessage.success('删除申请已提交，管理员通过后生效')
      loadData()
      loadFilterOptions()
      loadRecentOperations()
      loadMyApprovals()
    } else {
      ElMessage.error(res.data.msg || '提交删除审核失败，该数据可能已有待审核操作')
    }
  } catch (error) {
  }
}

const parseJson = (text) => {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch (error) {
    return {}
  }
}

const approvalTargetTitle = (row) => {
  const request = parseJson(row.requestContent)
  return row.targetTitle || request.title || `经验 #${row.experienceId || '-'}`
}

const approvalSummary = (row) => {
  const request = parseJson(row.requestContent)
  if (row.actionType === 'CREATE') return `新增《${request.title || row.targetTitle || '未命名经验'}》`
  if (row.actionType === 'UPDATE') return `修改《${row.targetTitle || request.title || '未命名经验'}》`
  if (row.actionType === 'DELETE') return `删除《${row.targetTitle || request.title || '未命名经验'}》`
  if (row.actionType === 'ADOPT') return `采纳说明：${request.adoptComment || '未填写'}`
  return row.targetTitle || '-'
}

const approvalStatusLabel = (status) => approvalStatusMeta[status]?.label || status || '-'

const approvalStatusTagType = (status) => approvalStatusMeta[status]?.type || 'info'

const canRetryApproval = (row) => {
  return row?.status === 'REJECTED' && ['CREATE', 'UPDATE', 'ADOPT', 'DELETE'].includes(row.actionType)
}

const approvalRetryLabel = (row) => {
  if (row.actionType === 'DELETE') return '重新提交'
  if (row.actionType === 'ADOPT') return '修改说明'
  return '修改再提交'
}

const handleRetryApproval = async (row) => {
  if (!(await ensureOperatorReady())) return

  const request = parseJson(row.requestContent)
  if (row.actionType === 'CREATE' || row.actionType === 'UPDATE') {
    formMode.value = row.actionType === 'CREATE' ? 'add' : 'edit'
    formData.value = {
      ...createEmptyForm(),
      ...request,
      id: row.actionType === 'CREATE' ? null : (request.id || row.experienceId),
      creatorName: row.actionType === 'CREATE' ? currentOperatorName.value : request.creatorName,
      updaterName: currentOperatorName.value,
      referenceValueScore: normalizeScore(request.referenceValueScore),
    }
    analysisResult.value = null
    myApprovalVisible.value = false
    formVisible.value = true
    return
  }

  if (row.actionType === 'ADOPT') {
    const experienceId = request.experienceId || row.experienceId
    if (!experienceId) {
      ElMessage.warning('未找到关联经验，无法重新提交采纳审核')
      return
    }
    adoptFormData.value = {
      experienceId,
      adopterName: currentOperatorName.value,
      adoptComment: request.adoptComment || '',
    }
    myApprovalVisible.value = false
    adoptVisible.value = true
    return
  }

  if (row.actionType === 'DELETE') {
    const experienceId = request.experienceId || row.experienceId
    if (!experienceId) {
      ElMessage.warning('未找到关联经验，无法重新提交删除审核')
      return
    }
    await handleDelete({
      id: experienceId,
      title: approvalTargetTitle(row),
    })
  }
}

const openAddDialog = () => {
  formMode.value = 'add'
  formData.value = createEmptyForm()
  formData.value.creatorName = operatorReady.value ? currentOperatorName.value : ''
  formData.value.updaterName = operatorReady.value ? currentOperatorName.value : ''
  analysisResult.value = null
  formVisible.value = true
}

const applyTemplate = (template) => {
  if (!formVisible.value) {
    openAddDialog()
  }

  Object.keys(template.data).forEach((key) => {
    if (!formData.value[key]) {
      formData.value[key] = template.data[key]
    } else if (['problemType', 'riskLevel', 'tags', 'reuseScenario', 'referenceValueScore'].includes(key)) {
      formData.value[key] = template.data[key]
    }
  })

  templateVisible.value = false
  ElMessage.success(`已套用「${template.name}」`)
}

const openTemplateCreate = () => {
  templateForm.value = createEmptyTemplateForm()
  templateFormVisible.value = true
}

const saveCurrentAsTemplate = () => {
  const hasContent = formData.value.title || formData.value.problemDesc || formData.value.solution || formData.value.summary
  if (!hasContent) {
    ElMessage.warning('当前表单还没有可保存为模板的内容')
    return
  }

  templateForm.value = {
    id: Date.now(),
    name: formData.value.title ? `${formData.value.title}模板` : '自定义经验模板',
    desc: '由当前经验表单保存生成，可在新增经验时复用。',
    custom: true,
    data: {
      problemType: formData.value.problemType || '',
      riskLevel: formData.value.riskLevel || '中',
      tags: formData.value.tags || '',
      reuseScenario: formData.value.reuseScenario || '',
      referenceValueScore: formData.value.referenceValueScore || 80,
      sceneDesc: formData.value.sceneDesc || '',
      problemDesc: formData.value.problemDesc || '',
      reasonAnalysis: formData.value.reasonAnalysis || '',
      solution: formData.value.solution || '',
      summary: formData.value.summary || '',
    },
  }
  templateFormVisible.value = true
}

const saveCustomTemplate = () => {
  if (!templateForm.value.name.trim()) {
    ElMessage.warning('请输入模板名称')
    return
  }

  const nextTemplate = {
    ...templateForm.value,
    id: templateForm.value.id || Date.now(),
    name: templateForm.value.name.trim(),
    desc: templateForm.value.desc.trim() || '自定义经验模板',
    custom: true,
    data: {
      ...templateForm.value.data,
      referenceValueScore: normalizeScore(templateForm.value.data.referenceValueScore || 80),
    },
  }
  customTemplates.value = [
    nextTemplate,
    ...customTemplates.value.filter((item) => item.id !== nextTemplate.id),
  ]
  persistTemplates()
  templateFormVisible.value = false
  ElMessage.success('模板已保存')
}

const deleteCustomTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(`确认删除模板「${template.name}」？`, '删除模板', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    customTemplates.value = customTemplates.value.filter((item) => item.id !== template.id)
    persistTemplates()
    ElMessage.success('模板已删除')
  } catch (error) {
  }
}

const openEditDialog = async (row) => {
  try {
    const res = await getExperienceById(row.id)
    if (res.data.code === 200) {
      formMode.value = 'edit'
      formData.value = {
        ...createEmptyForm(),
        ...res.data.data,
        updaterName: operatorReady.value ? currentOperatorName.value : '',
        referenceValueScore: normalizeScore(res.data.data.referenceValueScore),
      }
      analysisResult.value = null
      formVisible.value = true
    } else {
      ElMessage.error('获取编辑数据失败')
    }
  } catch (error) {
    ElMessage.error('获取编辑数据失败')
  }
}

const submitForm = async () => {
  if (!formRef.value) return
  if (!(await ensureOperatorReady())) return

  if (formMode.value === 'add') {
    formData.value.creatorName = currentOperatorName.value
    formData.value.updaterName = currentOperatorName.value
  } else {
    formData.value.updaterName = currentOperatorName.value
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const payload = sanitizeExperience(formData.value)
      const res = formMode.value === 'add' ? await addExperience(payload) : await updateExperience(payload)
      if (res.data.code === 200 && res.data.data === true) {
        ElMessage.success(formMode.value === 'add' ? '新增申请已提交，管理员通过后生效' : '修改申请已提交，管理员通过后生效')
        formVisible.value = false
        loadData()
        loadFilterOptions()
        loadRecentOperations()
        loadMyApprovals()
      } else {
        ElMessage.error(res.data.msg || '保存失败')
      }
    } catch (error) {
      ElMessage.error('保存失败，请检查后端接口')
    }
  })
}

const runAnalysis = async () => {
  analyzing.value = true
  try {
    const res = await analyzeExperience(formData.value)
    if (res.data.code === 200) {
      analysisResult.value = res.data.data
      fillEmptyAnalysisFields()
      ElMessage.success('智能分析已完成')
    } else {
      ElMessage.error(res.data.msg || '智能分析失败')
    }
  } catch (error) {
    ElMessage.error('智能分析失败，请检查后端接口')
  } finally {
    analyzing.value = false
  }
}

const fillEmptyAnalysisFields = () => {
  if (!analysisResult.value) return
  const result = analysisResult.value
  formData.value.problemType = formData.value.problemType || result.problemType || ''
  formData.value.riskLevel = formData.value.riskLevel || result.riskLevel || '低'
  formData.value.tags = formData.value.tags || result.tags || ''
  formData.value.reuseScenario = formData.value.reuseScenario || result.reuseScenario || ''
  formData.value.referenceValueScore = formData.value.referenceValueScore || result.referenceValueScore || 0
  formData.value.summary = formData.value.summary || result.summarySuggestion || ''
}

const applyAnalysisResult = () => {
  if (!analysisResult.value) return
  const result = analysisResult.value
  formData.value.problemType = result.problemType || formData.value.problemType
  formData.value.riskLevel = result.riskLevel || formData.value.riskLevel
  formData.value.tags = result.tags || formData.value.tags
  formData.value.reuseScenario = result.reuseScenario || formData.value.reuseScenario
  formData.value.referenceValueScore = result.referenceValueScore || formData.value.referenceValueScore
  formData.value.summary = result.summarySuggestion || formData.value.summary
  ElMessage.success('已应用智能建议')
}

const openAdoptDialog = (row) => {
  adoptFormData.value = {
    experienceId: row.id,
    adopterName: operatorReady.value ? currentOperatorName.value : '',
    adoptComment: '',
  }
  adoptVisible.value = true
}

const submitAdopt = async () => {
  if (!adoptFormRef.value) return

  await adoptFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      if (!(await ensureOperatorReady())) return
      adoptFormData.value.adopterName = currentOperatorName.value
      const res = await adoptExperience(adoptFormData.value)
      if (res.data.code === 200 && res.data.data === true) {
        ElMessage.success('采纳申请已提交，管理员通过后生效')
        adoptVisible.value = false
        loadData()
        loadRecentOperations()
        loadMyApprovals()
      } else {
        ElMessage.error(res.data.msg || '提交采纳审核失败')
      }
    } catch (error) {
      ElMessage.error('提交采纳审核失败，请检查后端接口')
    }
  })
}

const persistFavorites = () => {
  writeStorage(STORAGE_KEYS.favorites, favoriteIds.value)
}

const persistCompare = () => {
  writeStorage(STORAGE_KEYS.compare, compareItems.value)
}

const persistNotes = () => {
  writeStorage(STORAGE_KEYS.notes, noteMap.value)
}

const persistRecent = () => {
  writeStorage(STORAGE_KEYS.recent, recentViews.value)
}

const persistTemplates = () => {
  writeStorage(STORAGE_KEYS.templates, customTemplates.value)
}

const isFavorite = (row) => {
  return !!row?.id && favoriteIds.value.includes(Number(row.id))
}

const toggleFavorite = (row) => {
  if (!row?.id) return
  const id = Number(row.id)
  if (favoriteIds.value.includes(id)) {
    favoriteIds.value = favoriteIds.value.filter((item) => item !== id)
    ElMessage.success('已取消收藏')
  } else {
    favoriteIds.value = [...favoriteIds.value, id]
    ElMessage.success('已加入收藏夹')
  }
  persistFavorites()
}

const toggleFavoriteFilter = () => {
  favoriteOnly.value = !favoriteOnly.value
}

const normalizeCompareItem = (row) => ({
  id: row.id,
  title: row.title,
  projectName: row.projectName,
  projectCode: row.projectCode,
  problemType: row.problemType,
  riskLevel: row.riskLevel,
  referenceValueScore: row.referenceValueScore,
  viewCount: row.viewCount,
  adoptCount: row.adoptCount,
  tags: row.tags,
  reuseScenario: row.reuseScenario,
  problemDesc: row.problemDesc,
  solution: row.solution,
  summary: row.summary,
})

const isInCompare = (row) => {
  return !!row?.id && compareItems.value.some((item) => Number(item.id) === Number(row.id))
}

const toggleCompare = (row) => {
  if (!row?.id) return
  if (isInCompare(row)) {
    compareItems.value = compareItems.value.filter((item) => Number(item.id) !== Number(row.id))
    ElMessage.success('已移出对比')
  } else {
    if (compareItems.value.length >= 4) {
      ElMessage.warning('最多同时对比 4 条经验')
      return
    }
    compareItems.value = [...compareItems.value, normalizeCompareItem(row)]
    ElMessage.success('已加入对比')
  }
  persistCompare()
}

const removeCompare = (row) => {
  compareItems.value = compareItems.value.filter((item) => Number(item.id) !== Number(row.id))
  persistCompare()
}

const openCompareDrawer = () => {
  compareVisible.value = true
}

const clearCompare = () => {
  compareItems.value = []
  persistCompare()
}

const pushRecentView = (row) => {
  if (!row?.id) return
  const nextItem = normalizeCompareItem(row)
  recentViews.value = [
    nextItem,
    ...recentViews.value.filter((item) => Number(item.id) !== Number(row.id)),
  ].slice(0, 6)
  persistRecent()
}

const saveCurrentNote = () => {
  if (!detailData.value?.id) return
  noteMap.value = {
    ...noteMap.value,
    [String(detailData.value.id)]: currentNote.value,
  }
  persistNotes()
  ElMessage.success('笔记已保存')
}

const splitTags = (tags) => {
  if (!tags) return []
  return String(tags)
    .split(/[,，;；、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const riskTagType = (level) => {
  if (level === '高') return 'danger'
  if (level === '中') return 'warning'
  return 'success'
}

const operationTypeLabel = (type) => operationMeta[type]?.label || type || '未知操作'

const operationTagType = (type) => operationMeta[type]?.type || 'info'

const operationTargetTitle = (record) => {
  const target = tableData.value.find((item) => Number(item.id) === Number(record.experienceId))
  return target?.title || `经验 #${record.experienceId || '-'}`
}

const normalizeScore = (score) => {
  const value = Number(score || 0)
  return Math.max(0, Math.min(100, Math.round(value)))
}

const scoreStatus = (score) => {
  const value = normalizeScore(score)
  if (value >= 80) return 'success'
  if (value < 50) return 'exception'
  return undefined
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

const sanitizeExperience = (data) => ({
  ...data,
  referenceValueScore: normalizeScore(data.referenceValueScore),
  status: 2,
})

const formatDate = (value) => {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

const copyText = async (text, successMessage) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(successMessage)
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制')
  }
}

const copyActionPlan = async () => {
  if (!actionPlanList.value.length) {
    ElMessage.warning('暂无可复制的行动清单')
    return
  }

  const text = actionPlanList.value.map((item, index) => `${index + 1}. ${item}`).join('\n')
  await copyText(text, '行动清单已复制')
}

const buildReuseReport = (item) => {
  if (!item) return ''
  const actionText = detailData.value?.id === item.id && actionPlanList.value.length
    ? actionPlanList.value.map((action, index) => `${index + 1}. ${action}`).join('\n')
    : '进入经验详情后可生成复用行动清单'
  const noteText = noteMap.value[String(item.id)] || currentNote.value || '暂无个人笔记'

  return [
    `# ${item.title || '未命名经验'}`,
    '',
    `项目：${item.projectName || '未填写项目'}`,
    `项目编号：${item.projectCode || '未填写编号'}`,
    `问题类型：${item.problemType || '综合管理'}`,
    `风险等级：${item.riskLevel || '低'}`,
    `复用价值：${normalizeScore(item.referenceValueScore)}分`,
    `标签：${item.tags || '暂无标签'}`,
    '',
    '## 问题与原因',
    item.problemDesc || '暂无问题描述',
    '',
    item.reasonAnalysis || '暂无原因分析',
    '',
    '## 解决方案',
    item.solution || '暂无解决方案',
    '',
    '## 经验总结',
    item.summary || '暂无经验总结',
    '',
    '## 复用行动清单',
    actionText,
    '',
    '## 个人笔记',
    noteText,
  ].join('\n')
}

const copyReuseReport = async () => {
  await copyText(buildReuseReport(detailData.value), '复用报告已复制')
}

const copyRowReport = async (row) => {
  await copyText(buildReuseReport(row), '经验报告已复制')
}

const copyCompareReport = async () => {
  if (compareItems.value.length < 2) {
    ElMessage.warning('至少选择 2 条经验再复制对比')
    return
  }
  const text = compareRows.value
    .map((row) => {
      const values = compareItems.value
        .map((item) => `${item.title}：${row.values[item.id] || '-'}`)
        .join('\n')
      return `【${row.label}】\n${values}`
    })
    .join('\n\n')
  await copyText(text, '经验对比已复制')
}

const exportCsv = () => {
  if (!visibleTableData.value.length) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }

  const headers = ['ID', '标题', '项目', '项目编号', '问题类型', '风险等级', '标签', '价值评分', '浏览量', '采纳次数', '创建人', '更新时间']
  const rows = visibleTableData.value.map((item) => [
    item.id,
    item.title,
    item.projectName,
    item.projectCode,
    item.problemType,
    item.riskLevel,
    item.tags,
    item.referenceValueScore,
    item.viewCount,
    item.adoptCount,
    item.creatorName,
    formatDate(item.updateTime),
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `experience-${Date.now()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await refreshCurrentUser()
  loadData()
  loadFilterOptions()
  loadRecentOperations()
  loadMyApprovals()
})
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.workbench {
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
  font-size: 13px;
  font-weight: 700;
  color: #1677ff;
}

.workbench-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #111827;
}

.workbench-desc {
  margin: 10px 0 0;
  color: #6b7280;
}

.operator-tip {
  margin: 10px 0 0;
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
}

.operator-tip.warning {
  color: #e6a23c;
}

.workbench-actions,
.filter-actions,
.action-row,
.tab-toolbar,
.side-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.workbench-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 28px;
  color: #111827;
}

.metric-card em,
.metric-label {
  display: block;
  font-style: normal;
  font-size: 13px;
  color: #6b7280;
}

.metric-card.danger strong {
  color: #f56c6c;
}

.metric-card.favorite strong {
  color: #ff9f0a;
}

.metric-card.warning strong {
  color: #e6a23c;
}

.assistant-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.assistant-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 700;
}

.mini-list {
  display: grid;
  gap: 10px;
}

.mini-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.mini-item:hover {
  border-color: #1677ff;
  background: #f8fbff;
}

.mini-item strong {
  color: #111827;
}

.mini-item span {
  color: #6b7280;
  font-size: 13px;
}

.audit-mini-item {
  cursor: default;
}

.audit-line,
.trail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.audit-line strong,
.trail-head strong {
  min-width: 0;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-mini-item p,
.trail-item p,
.record-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.6;
  word-break: break-word;
}

.filter-card,
.list-card {
  border-radius: 8px;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.6fr repeat(5, minmax(140px, 1fr));
  gap: 12px;
}

.filter-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.active-filter-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.section-subtitle {
  margin-left: 10px;
  color: #909399;
}

.experience-cell {
  min-width: 0;
}

.title-button {
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: #1677ff;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.title-button:hover {
  color: #0958d9;
}

.cell-meta,
.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  color: #6b7280;
  font-size: 13px;
}

.cell-meta span:not(:last-child)::after,
.detail-meta span:not(:last-child)::after {
  content: "·";
  margin-left: 8px;
  color: #d1d5db;
}

.tag-list,
.detail-tags,
.stacked-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 9px;
}

.stacked-tags {
  margin-top: 0;
}

.count-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 700;
  color: #111827;
}

.count-pair i {
  color: #c0c4cc;
  font-style: normal;
}

.danger-text {
  color: #f56c6c;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 22px;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.detail-heading h3 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.detail-tabs {
  margin-top: 20px;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.content-block {
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.content-block span,
.side-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #4b5563;
}

.content-block p,
.side-section p {
  margin: 0;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
}

.tab-toolbar {
  justify-content: space-between;
  margin-bottom: 14px;
  font-weight: 700;
}

.action-plan {
  margin: 0;
  padding-left: 22px;
  color: #303133;
  line-height: 1.9;
}

.reuse-report-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.reuse-report-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 108px;
  gap: 20px;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.report-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: #1677ff;
  font-size: 13px;
  font-weight: 800;
}

.reuse-report-hero h4 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.35;
}

.reuse-report-hero p {
  margin: 10px 0 0;
  color: #4b5563;
  line-height: 1.7;
}

.report-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 108px;
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
}

.report-score strong {
  color: #1677ff;
  font-size: 34px;
  line-height: 1;
}

.report-score span {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
}

.report-meta-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.report-meta-grid div {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.report-meta-grid span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
}

.report-meta-grid strong {
  color: #111827;
  font-size: 15px;
}

.report-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0;
}

.report-section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.report-section {
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.report-section.full {
  margin-top: 14px;
}

.report-section span {
  display: block;
  margin-bottom: 10px;
  color: #111827;
  font-weight: 800;
}

.report-section p {
  margin: 0 0 10px;
  color: #4b5563;
  line-height: 1.7;
  white-space: pre-wrap;
}

.report-section p:last-child {
  margin-bottom: 0;
}

.report-action-list {
  margin: 0;
  padding-left: 20px;
  color: #303133;
  line-height: 1.9;
}

.recommend-list {
  display: grid;
  gap: 10px;
}

.recommend-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}

.recommend-item:hover {
  border-color: #1677ff;
}

.recommend-item span {
  color: #6b7280;
  font-size: 13px;
}

.detail-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 20px;
  border-left: 1px solid #eef2f7;
}

.side-section {
  padding-bottom: 14px;
  border-bottom: 1px solid #eef2f7;
}

.trail-list {
  display: grid;
  gap: 10px;
}

.trail-list.compact {
  gap: 8px;
}

.trail-item {
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.trail-item span {
  display: block;
  margin: 5px 0;
  color: #6b7280;
  font-size: 12px;
}

.side-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.side-metrics div {
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  text-align: center;
}

.side-metrics strong {
  display: block;
  color: #111827;
  font-size: 22px;
}

.side-metrics span {
  color: #6b7280;
  font-size: 12px;
}

.side-actions {
  flex-direction: column;
}

.side-actions .el-button {
  width: 100%;
  margin-left: 0;
}

.note-save {
  width: 100%;
  margin-top: 10px;
}

.form-section-title {
  margin: 10px 0 16px;
  font-size: 15px;
  font-weight: 800;
  color: #111827;
}

.form-section-title.with-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  align-items: start;
}

.operator-field {
  display: grid;
  gap: 6px;
  width: 100%;
}

.operator-field span {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.record-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.record-summary div {
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.record-summary span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
}

.record-summary strong {
  color: #111827;
  font-size: 20px;
}

.record-timeline {
  padding-right: 8px;
}

.record-card {
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.record-card p {
  margin-top: 10px;
}

.analysis-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin: 4px 0 18px 110px;
  padding: 14px 16px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
}

.analysis-panel p {
  margin: 6px 0 0;
  line-height: 1.7;
  color: #3f6212;
}

.analysis-panel ul {
  grid-column: 1 / -1;
  margin: 0;
  padding-left: 18px;
  color: #4b5563;
  line-height: 1.8;
}

.template-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.template-toolbar strong {
  display: block;
  margin-bottom: 4px;
  color: #111827;
}

.template-toolbar span {
  color: #6b7280;
  font-size: 13px;
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
  background: #ffffff;
}

.template-card strong {
  color: #111827;
  font-size: 16px;
}

.template-card p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.template-title-row,
.template-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.template-title-row {
  justify-content: space-between;
}

.template-actions {
  justify-content: flex-end;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.approval-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.approval-stat-row,
.approval-toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.approval-stat-row span {
  padding: 7px 10px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  color: #4b5563;
  font-size: 13px;
  font-weight: 700;
}

.summary-text {
  color: #303133;
  line-height: 1.6;
}

.compare-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.compare-cell {
  display: block;
  white-space: pre-wrap;
  line-height: 1.7;
}

.compare-selected-list,
.compare-candidate-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.compare-selected-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compare-selected-item,
.compare-candidate-card {
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.compare-selected-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.compare-selected-item span {
  overflow: hidden;
  color: #111827;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-candidate-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
}

.compare-candidate-card strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
  line-height: 1.45;
}

.compare-candidate-card p {
  margin: 0 0 12px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1320px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .workbench,
  .filter-footer,
  .detail-heading,
  .template-toolbar,
  .approval-toolbar,
  .compare-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-grid,
  .form-grid,
  .content-grid,
  .detail-layout,
  .metric-grid,
  .assistant-grid,
  .reuse-report-hero,
  .report-meta-grid,
  .report-section-grid,
  .record-summary,
  .template-grid,
  .compare-selected-list,
  .compare-candidate-grid {
    grid-template-columns: 1fr;
  }

  .detail-side {
    padding-left: 0;
    border-left: 0;
  }

  .analysis-panel {
    margin-left: 0;
    grid-template-columns: 1fr;
  }
}
</style>
