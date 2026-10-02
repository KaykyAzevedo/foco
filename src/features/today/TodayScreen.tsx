// Hoje — sem plano: ação primária "Planejar meu dia" (ritual com cartas, máx. 3 principais).
// Com plano: progresso + missão + lista curta ordenável. "Replanejar" fica discreto no fim.
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck } from 'lucide-react'
import { useToday } from '@/store'
import { Button, fadeUp, Glass } from '@/ui'
import { useFocusOnMount } from '../shared/useFocusOnMount'
import { DayProgress } from './DayProgress'
import { PlanDay } from './PlanDay'
import { TodayList } from './TodayList'

interface Props {
  onStartFocus: (taskId: string) => void
}

export function TodayScreen({ onStartFocus }: Props) {
  const { tasks, progress, planned, candidates } = useToday()
  const [planning, setPlanning] = useState(false)
  // Ao sair do ritual, os botões clicados desmontam: o foco vai pro botão principal da próxima vista.
  const focusFlag = useRef(false)

  function leavePlanning() {
    focusFlag.current = true
    setPlanning(false)
  }

  const view = planning ? 'plan' : planned ? 'list' : 'invite'

  return (
    <section aria-labelledby="today-title" className="flex flex-col gap-4">
      <h1 id="today-title" className="text-center text-sm font-semibold tracking-widest text-text-2 uppercase">
        Hoje
      </h1>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} variants={fadeUp} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-4">
          {view === 'plan' && (
            <PlanDay
              tasks={[...tasks, ...candidates]}
              initialMain={tasks.filter((t) => t.isMain).map((t) => t.id)}
              initialExtra={tasks.filter((t) => !t.isMain).map((t) => t.id)}
              onDone={leavePlanning}
              onCancel={leavePlanning}
            />
          )}

          {view === 'invite' && (
            <Invite focusFlag={focusFlag} canPlan={candidates.length > 0} onPlan={() => setPlanning(true)} />
          )}

          {view === 'list' && (
            <PlannedDay
              focusFlag={focusFlag}
              tasks={tasks}
              progress={progress}
              hasCandidates={candidates.length > 0}
              onStartFocus={onStartFocus}
              onPlan={() => setPlanning(true)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

interface InviteProps {
  focusFlag: React.RefObject<boolean>
  canPlan: boolean
  onPlan: () => void
}

function Invite({ focusFlag, canPlan, onPlan }: InviteProps) {
  const planRef = useFocusOnMount<HTMLButtonElement>(focusFlag)
  return (
    <Glass intensity="regular" radius="xl" className="flex flex-col items-center gap-3 p-8 text-center">
      <CalendarCheck aria-hidden size={40} className="text-accent" />
      <h2 className="text-2xl font-semibold">Como vai ser hoje?</h2>
      <p className="text-text-2">
        {canPlan
          ? 'Escolha até 3 coisas importantes. O resto pode esperar.'
          : 'Ainda não há tarefas. Capture algumas e volte aqui.'}
      </p>
      <Button ref={planRef} variant="primary" size="lg" fullWidth disabled={!canPlan} onClick={onPlan} className="mt-2">
        Planejar meu dia
      </Button>
    </Glass>
  )
}

interface PlannedProps {
  focusFlag: React.RefObject<boolean>
  tasks: ReturnType<typeof useToday>['tasks']
  progress: ReturnType<typeof useToday>['progress']
  hasCandidates: boolean
  onStartFocus: (taskId: string) => void
  onPlan: () => void
}

function PlannedDay({ focusFlag, tasks, progress, hasCandidates, onStartFocus, onPlan }: PlannedProps) {
  const replanRef = useFocusOnMount<HTMLButtonElement>(focusFlag)
  const allDone = tasks.length === 0
  return (
    <>
      <DayProgress progress={progress} />
      {!allDone && (
        <TodayList
          tasks={tasks}
          onStartFocus={onStartFocus}
          // concluiu a última: o foco vai pro botão que fica (o DayProgress já celebra "Dia completo!")
          onEmptied={() => requestAnimationFrame(() => replanRef.current?.focus({ preventScroll: true }))}
        />
      )}
      {/* com tudo feito, quem quer continuar puxa mais; senão, replaneja discretamente */}
      {(!allDone || hasCandidates) && (
        <Button ref={replanRef} variant="ghost" size="sm" onClick={onPlan} className="self-center">
          {allDone ? 'Puxar mais uma?' : 'Replanejar o dia'}
        </Button>
      )}
    </>
  )
}
