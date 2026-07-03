import client from '../../../api/client'

// ─── Epics ───────────────────────────────────────────────────────────────────

export type EpicStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE' | 'ON_HOLD'

export interface EpicDto {
  id: string
  code: string
  name: string
  objective: string | null
  successCriteria: string | null
  module: string | null
  priority: TaskPriority
  status: EpicStatus
  totalStories: number
  doneStories: number
  createdAt: string
}

export interface EpicRequest {
  code?: string
  name: string
  objective?: string
  successCriteria?: string
  module?: string
  priority?: TaskPriority
  status?: EpicStatus
}

export const epicsApi = {
  listAll: () => client.get<EpicDto[]>('/epics').then(r => r.data),
  create: (req: EpicRequest) => client.post<EpicDto>('/epics', req).then(r => r.data),
  update: (id: string, req: EpicRequest) => client.put<EpicDto>(`/epics/${id}`, req).then(r => r.data),
  updateStatus: (id: string, status: EpicStatus) =>
    client.patch<EpicDto>(`/epics/${id}/status`, null, { params: { status } }).then(r => r.data),
  delete: (id: string) => client.delete(`/epics/${id}`),
}

// ─── User Stories ────────────────────────────────────────────────────────────

export type StoryType = 'FUNCTIONAL' | 'NON_FUNCTIONAL'
export type StoryStatus = 'DEFINED' | 'IN_DEV' | 'REVIEW' | 'READY_FOR_QA' | 'IN_QA' | 'QA_FAILED' | 'DONE' | 'BLOCKED'
export type NfrCategory = 'DATA_INTEGRITY' | 'CONSISTENCY' | 'BUSINESS_RULES' | 'SECURITY' | 'PERFORMANCE' | 'USABILITY' | 'COMPLIANCE'
export type ScenarioType = 'HAPPY_PATH' | 'NEGATIVE' | 'EDGE'

export interface StoryScenarioDto {
  id: string
  scenarioTitle: string
  givenConditions: string
  whenEvent: string
  thenOutcome: string
  scenarioType: ScenarioType
  sortOrder: number
}

export interface UserStoryDto {
  id: string
  reqId: string
  epicId: string | null
  epicCode: string | null
  epicName: string | null
  storyType: StoryType
  persona: string | null
  actionStatement: string | null
  outcomeStatement: string | null
  description: string | null
  module: string | null
  priority: TaskPriority
  status: StoryStatus
  nfrCategory: NfrCategory | null
  nfrCriterion: string | null
  scenarios: StoryScenarioDto[]
  createdAt: string
}

export interface UserStoryRequest {
  reqId: string
  epicId?: string | null
  storyType?: StoryType
  persona?: string
  actionStatement?: string
  outcomeStatement?: string
  description?: string
  module?: string
  priority?: TaskPriority
  status?: StoryStatus
  nfrCategory?: NfrCategory
  nfrCriterion?: string
}

export interface StoryScenarioRequest {
  scenarioTitle: string
  givenConditions: string
  whenEvent: string
  thenOutcome: string
  scenarioType?: ScenarioType
  sortOrder?: number
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export interface AiChatMessage { role: 'user' | 'assistant'; content: string }

export interface AiContextDto {
  settingKey: string
  label: string
  content: string
  updatedAt: string | null
}

export const aiApi = {
  generate: (messages: AiChatMessage[]) =>
    client.post<{ content: string }>('/ai/generate-prompt', { messages }).then(r => r.data),
  getContext: () =>
    client.get<AiContextDto>('/ai/context').then(r => r.data),
  updateContext: (content: string) =>
    client.put<AiContextDto>('/ai/context', { content }).then(r => r.data),
}

// ─── User Stories API ─────────────────────────────────────────────────────────

export const userStoriesApi = {
  listFiltered: (storyType?: string, module?: string, status?: string) => {
    const params: Record<string, string> = {}
    if (storyType) params.storyType = storyType
    if (module) params.module = module
    if (status) params.status = status
    return client.get<UserStoryDto[]>('/user-stories', { params }).then(r => r.data)
  },
  create: (req: UserStoryRequest) => client.post<UserStoryDto>('/user-stories', req).then(r => r.data),
  update: (id: string, req: UserStoryRequest) => client.put<UserStoryDto>(`/user-stories/${id}`, req).then(r => r.data),
  updateStatus: (id: string, status: StoryStatus) =>
    client.patch<UserStoryDto>(`/user-stories/${id}/status`, null, { params: { status } }).then(r => r.data),
  delete: (id: string) => client.delete(`/user-stories/${id}`),
  addScenario: (storyId: string, req: StoryScenarioRequest) =>
    client.post<StoryScenarioDto>(`/user-stories/${storyId}/scenarios`, req).then(r => r.data),
  updateScenario: (scenarioId: string, req: StoryScenarioRequest) =>
    client.put<StoryScenarioDto>(`/user-stories/scenarios/${scenarioId}`, req).then(r => r.data),
  deleteScenario: (scenarioId: string) => client.delete(`/user-stories/scenarios/${scenarioId}`),
}

// ─── QA: ejecuciones de prueba ────────────────────────────────────────────────

export type TestResult = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED'

export interface TestExecutionDto {
  id: string
  scenarioId: string
  scenarioTitle: string
  result: TestResult
  executedBy: TaskAssignee | null
  notes: string | null
  defectTaskId: string | null
  defectTaskTitle: string | null
  executedAt: string
  storyStatusAfter: StoryStatus
}

export interface TestExecutionRequest {
  result: TestResult
  executedBy?: TaskAssignee
  notes?: string
  createDefect?: boolean
  defectTitle?: string
  defectAssignee?: TaskAssignee
}

export const qaApi = {
  listExecutions: (storyId: string) =>
    client.get<TestExecutionDto[]>(`/user-stories/${storyId}/test-executions`).then(r => r.data),
  recordExecution: (storyId: string, scenarioId: string, req: TestExecutionRequest) =>
    client.post<TestExecutionDto>(`/user-stories/${storyId}/scenarios/${scenarioId}/test-executions`, req).then(r => r.data),
}

// ─── Tasks / Sprints / Prompts ────────────────────────────────────────────────

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED'
export type TaskType = 'DEV' | 'QA' | 'BUG' | 'PLANNING' | 'INFRA' | 'DESIGN'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type TaskAssignee = 'MANUEL' | 'ISKIAN'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type PromptCategory = 'NEW_FEATURE' | 'BUG_FIX' | 'REFACTOR' | 'DOCUMENTATION' | 'TESTING' | 'DATABASE' | 'CONFIGURATION'
export type PromptStatus = 'DRAFT' | 'READY' | 'USED' | 'ARCHIVED'

export interface SprintDto {
  id: string
  name: string
  goal: string | null
  startDate: string | null
  endDate: string | null
  status: SprintStatus
  createdAt: string
}

export interface ProjectTaskDto {
  id: string
  title: string
  description: string | null
  taskType: TaskType
  status: TaskStatus
  assignee: TaskAssignee | null
  priority: TaskPriority
  sprintId: string | null
  sprintName: string | null
  module: string | null
  linkedRequirementId: string | null
  userStoryId: string | null
  estimatedHours: number | null
  actualHours: number | null
  notes: string | null
  completedAt: string | null
  createdAt: string
}

export interface PromptPlanDto {
  id: string
  title: string
  objective: string | null
  contextInfo: string | null
  promptContent: string
  module: string | null
  category: PromptCategory
  status: PromptStatus
  linkedTaskId: string | null
  linkedTaskTitle: string | null
  effectivenessRating: number | null
  executionNotes: string | null
  executedAt: string | null
  createdAt: string
}

export interface SprintRequest {
  name: string
  goal?: string
  startDate?: string
  endDate?: string
}

export interface ProjectTaskRequest {
  title: string
  description?: string
  taskType?: TaskType
  assignee?: TaskAssignee
  priority?: TaskPriority
  sprintId?: string | null
  module?: string
  userStoryId?: string | null
  estimatedHours?: number
  notes?: string
}

export interface PromptPlanRequest {
  title: string
  objective?: string
  contextInfo?: string
  promptContent: string
  module?: string
  category?: PromptCategory
  linkedTaskId?: string | null
}

export const sprintsApi = {
  listAll: () => client.get<SprintDto[]>('/sprints').then(r => r.data),
  create: (req: SprintRequest) => client.post<SprintDto>('/sprints', req).then(r => r.data),
  activate: (id: string) => client.post<SprintDto>(`/sprints/${id}/activate`).then(r => r.data),
  complete: (id: string) => client.post<SprintDto>(`/sprints/${id}/complete`).then(r => r.data),
  delete: (id: string) => client.delete(`/sprints/${id}`),
}

export const projectTasksApi = {
  listFiltered: (sprintId?: string, assignee?: string, status?: string) => {
    const params: Record<string, string> = {}
    if (sprintId) params.sprintId = sprintId
    if (assignee) params.assignee = assignee
    if (status) params.status = status
    return client.get<ProjectTaskDto[]>('/project-tasks', { params }).then(r => r.data)
  },
  create: (req: ProjectTaskRequest) => client.post<ProjectTaskDto>('/project-tasks', req).then(r => r.data),
  update: (id: string, req: ProjectTaskRequest) => client.put<ProjectTaskDto>(`/project-tasks/${id}`, req).then(r => r.data),
  updateStatus: (id: string, status: TaskStatus) => client.patch<ProjectTaskDto>(`/project-tasks/${id}/status`, { status }).then(r => r.data),
  delete: (id: string) => client.delete(`/project-tasks/${id}`),
}

export const promptPlansApi = {
  listAll: () => client.get<PromptPlanDto[]>('/prompt-plans').then(r => r.data),
  create: (req: PromptPlanRequest) => client.post<PromptPlanDto>('/prompt-plans', req).then(r => r.data),
  update: (id: string, req: PromptPlanRequest) => client.put<PromptPlanDto>(`/prompt-plans/${id}`, req).then(r => r.data),
  updateStatus: (id: string, status: PromptStatus) => client.patch<PromptPlanDto>(`/prompt-plans/${id}/status`, null, { params: { status } }).then(r => r.data),
  recordExecution: (id: string, rating: number, notes: string) =>
    client.patch<PromptPlanDto>(`/prompt-plans/${id}/execution`, { rating, notes }).then(r => r.data),
  delete: (id: string) => client.delete(`/prompt-plans/${id}`),
}
