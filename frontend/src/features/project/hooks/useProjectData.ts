import { useQuery } from '@tanstack/react-query'
import { sprintsApi, projectTasksApi, promptPlansApi, userStoriesApi, epicsApi } from '../api/projectApi'

/** Datos base del módulo Project compartidos por todas las pestañas. */
export function useProjectData() {
  const { data: sprints = [] } = useQuery({ queryKey: ['sprints'], queryFn: sprintsApi.listAll })
  const { data: tasks = [] } = useQuery({ queryKey: ['project-tasks'], queryFn: () => projectTasksApi.listFiltered() })
  const { data: prompts = [] } = useQuery({ queryKey: ['prompt-plans'], queryFn: promptPlansApi.listAll })
  const { data: stories = [] } = useQuery({ queryKey: ['user-stories'], queryFn: () => userStoriesApi.listFiltered() })
  const { data: epics = [] } = useQuery({ queryKey: ['epics'], queryFn: epicsApi.listAll })

  return { sprints, tasks, prompts, stories, epics }
}
