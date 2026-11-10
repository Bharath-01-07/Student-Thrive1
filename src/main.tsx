import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, ArrowLeft, Award, BarChart3, Bell, BookOpen, Bot, CalendarCheck2, CheckCircle2, ChevronDown, CircleHelp, ClipboardCheck, GraduationCap, HeartPulse, LayoutDashboard, LogIn, LogOut, Menu, MessageCircle, Plus, Search, Send, Settings, ShieldCheck, Sparkles, Target, TrendingUp, Upload, Users, X } from 'lucide-react'
import { api, type ApiUser, type ImportResult, type ProgressHistoryRecord, type UserRole } from './api'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './styles.css'

type RegistrationRole = 'Student' | 'Faculty' | 'Advisor'
type RegistrationDraft = { name: string; reg: string; email: string; password: string; course: string; year: string; section: string; subjects: string; interests: string; details: string; department: string; employeeId: string }
type ProgressDraft = { attendance: string; gpa: string; skills: string; streak: string; subject: string; achievement: string; wellbeing: string; notes: string }

function RegistrationPage({ draft, error, role, onChange, onSubmit, onClose, onLogin }: { draft: RegistrationDraft; error: string; role: RegistrationRole; onChange: (draft: RegistrationDraft) => void; onSubmit: (event: FormEvent) => void; onClose: () => void; onLogin: () => void }) {
  const update = (key: keyof RegistrationDraft, value: string) => onChange({ ...draft, [key]: value })
  const isStudent = role === 'Student'

  return <div className="registration-page">
    <header className="registration-topbar">
      <button className="back-button" onClick={onClose}><ArrowLeft size={17} /> Back to entrance</button>
      <UniversityBrand compact />
      <span className="secure-label"><CheckCircle2 size={15} /> Secure {role.toLowerCase()} profile setup</span>
    </header>
    <main className="registration-content">
      <div className="registration-intro">
        <p className="eyebrow">{role} profile · Step 1 of 1</p>
        <h1>Build your <em>{role.toLowerCase()} profile.</em></h1>
        <p>{isStudent ? 'Create a personal student profile with unique credentials and growth interests.' : `Create a separate ${role.toLowerCase()} workspace profile with unique access credentials.`}</p>
      </div>
      <form className="registration-form" onSubmit={onSubmit}>
        <section className="form-section">
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div><h2>{role} information</h2><p>Use unique identity details for this account.</p></div>
          </div>
          <div className="form-grid">
            <label className="wide-field">Full name<input autoFocus required value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder={isStudent ? 'e.g. Ananya Rao' : role === 'Faculty' ? 'e.g. Dr. Priya Shah' : 'e.g. Alex Kumar'} /></label>
            <label>Email address<input type="email" required value={draft.email} onChange={(event) => update('email', event.target.value)} placeholder="you@institution.edu" /></label>
            <label>Password<input type="password" required minLength={8} value={draft.password} onChange={(event) => update('password', event.target.value)} placeholder="At least 8 characters" /></label>
            {isStudent ? <>
              <label>Registration number<input required value={draft.reg} onChange={(event) => update('reg', event.target.value)} placeholder="STU-2024-0201" /></label>
              <label>Course<input required value={draft.course} onChange={(event) => update('course', event.target.value)} placeholder="e.g. Computer Science" /></label>
              <label>Year (optional)<select value={draft.year} onChange={(event) => update('year', event.target.value)}><option value="">Not provided</option><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option></select></label>
              <label>Section (optional)<select value={draft.section} onChange={(event) => update('section', event.target.value)}><option value="">Not provided</option><option>Section A</option><option>Section B</option><option>Section C</option></select></label>
              <label className="wide-field">Subjects of interest<input value={draft.subjects} onChange={(event) => update('subjects', event.target.value)} placeholder="e.g. Data Structures, Design" /></label>
              <label className="wide-field">Skills to build<input value={draft.interests} onChange={(event) => update('interests', event.target.value)} placeholder="e.g. Problem solving, research" /></label>
              <label className="wide-field wide-span">About the student<textarea value={draft.details} onChange={(event) => update('details', event.target.value)} placeholder="Add a short note about goals, interests, or support needs." /></label>
            </> : <>
              <label>Employee ID<input required value={draft.employeeId} onChange={(event) => update('employeeId', event.target.value)} placeholder="EMP-2048" /></label>
              <label>Department<input required value={draft.department} onChange={(event) => update('department', event.target.value)} placeholder="Computer Science" /></label>
            </>}
          </div>
        </section>
        {error && <p className="form-error"><CircleHelp size={14} /> {error}</p>}
        <div className="registration-actions">
          <button type="button" className="text-button" onClick={onLogin}>Already registered? Sign in</button>
          <button type="submit" className="primary-button">Create {role.toLowerCase()} profile</button>
        </div>
      </form>
    </main>
  </div>
}
function ProgressPage({ studentName, registrationNumber, draft, error, onChange, onSubmit, onClose }: { studentName: string; registrationNumber: string; draft: ProgressDraft; error: string; onChange: (draft: ProgressDraft) => void; onSubmit: (event: FormEvent) => void; onClose: () => void }) {
  const update = (key: keyof ProgressDraft, value: string) => onChange({ ...draft, [key]: value })

  return <div className="progress-page">
    <header className="registration-topbar">
      <button className="back-button" onClick={onClose}><ArrowLeft size={17} /> Back to student view</button>
      <UniversityBrand compact />
      <span className="secure-label"><CheckCircle2 size={15} /> Authorized update</span>
    </header>
    <main className="progress-content">
      <div className="registration-intro">
        <p className="eyebrow">Progress record · {registrationNumber}</p>
        <h1>Update <em>{studentName}</em>.</h1>
        <p>Record the latest verified signals. Saving an update refreshes the student dashboard and adds to their progress history.</p>
      </div>
      <form className="progress-form" onSubmit={onSubmit}>
        <section className="form-section">
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div><h2>Core progress signals</h2><p>Use the latest verified values from your academic systems.</p></div>
          </div>
          <div className="form-grid">
            <label>Attendance %<input type="number" min="0" max="100" required value={draft.attendance} onChange={(event) => update('attendance', event.target.value)} placeholder="e.g. 92" /><small>Between 0 and 100.</small></label>
            <label>Academic average<input type="number" min="0" max="10" step="0.1" required value={draft.gpa} onChange={(event) => update('gpa', event.target.value)} placeholder="e.g. 8.6" /><small>GPA or average out of 10.</small></label>
            <label>Skills growth %<input type="number" min="0" max="100" required value={draft.skills} onChange={(event) => update('skills', event.target.value)} placeholder="e.g. 78" /></label>
            <label>Consistency streak<input type="number" min="0" required value={draft.streak} onChange={(event) => update('streak', event.target.value)} placeholder="e.g. 12" /><small>Weeks of consistent activity.</small></label>
          </div>
        </section>

        <section className="form-section">
          <div className="form-section-heading">
            <span className="form-step">02</span>
            <div><h2>Context and notes</h2><p>Add supporting details that explain the trend.</p></div>
          </div>
          <div className="form-grid">
            <label>Current subject<input value={draft.subject} onChange={(event) => update('subject', event.target.value)} placeholder="e.g. Data Structures" /></label>
            <label>Recent achievement<input value={draft.achievement} onChange={(event) => update('achievement', event.target.value)} placeholder="e.g. Science fair finalist" /></label>
            <label>Well-being<input value={draft.wellbeing} onChange={(event) => update('wellbeing', event.target.value)} placeholder="e.g. Doing well" /></label>
            <label className="wide-field wide-span">Notes<textarea value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Add context for the academic and wellbeing progress." /></label>
          </div>
        </section>
        {error && <p className="form-error"><CircleHelp size={14} /> {error}</p>}
        <div className="registration-actions">
          <button type="button" className="text-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button">Save progress update</button>
        </div>
      </form>
    </main>
  </div>
}

function UniversityBrand({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'university-brand compact' : 'university-brand'}>
    <span className="brand-mark"><Sparkles size={17} /></span>
    <span><strong>Vignan University</strong><b>Student Thrive</b>{!compact && <small>AI-powered student success portal</small>}</span>
  </div>
}

type Student = { name: string; initials: string; reg: string; email: string; course: string; department: string; year: string; section: string; attendance: number | null; gpa: number | null; streak: number | null; skills: number | null; wellbeing: string; accent: string; subjects: string[]; interests: string[]; details: string; isDemo: boolean; latestAchievement?: string; progressSubject?: string; progressNotes?: string; achievementMeta?: string; growthFlow?: { title: string; detail: string; time: string; color: string }[] }
const emptyStudent: Student = { name: '', initials: '', reg: 'Not provided', email: '', course: 'Not provided', department: 'Not provided', year: 'Not provided', section: 'Not provided', attendance: null, gpa: null, streak: null, skills: null, wellbeing: 'Not recorded', accent: '#9185b6', subjects: [], interests: [], details: '', isDemo: false }
const mapApiStudent = (user: ApiUser): Student => {
  const progress = user.progress || {}
  const fullName = user.name
  const initials = fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'
  return {
    name: fullName,
    initials,
    reg: user.reg || 'Not provided',
    email: user.email,
    course: user.course || 'Not provided',
    department: user.department || 'Not provided',
    year: user.year || 'Not provided',
    section: user.section || 'Not provided',
    attendance: progress.attendance ?? null,
    gpa: progress.gpa ?? null,
    streak: progress.streak ?? null,
    skills: progress.skills ?? null,
    wellbeing: progress.wellbeing || 'Not recorded',
    accent: '#9185b6',
    subjects: user.subjects,
    interests: user.interests,
    details: user.details || '',
    isDemo: user.is_demo,
    latestAchievement: progress.achievement || undefined,
    progressSubject: progress.subject || undefined,
    progressNotes: progress.notes || undefined,
    achievementMeta: progress.achievement ? 'Latest recorded achievement' : undefined,
  }
}
const parseRole = (value: string): UserRole => value === 'Faculty' || value === 'Advisor' ? value : 'Student'
const navItems = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Progress', icon: TrendingUp }, { label: 'Attendance', icon: CalendarCheck2 }, { label: 'Academics', icon: GraduationCap }, { label: 'Skills & consistency', icon: Target }, { label: 'Well-being', icon: HeartPulse }, { label: 'Achievements', icon: Award }]

const dassQuestions = [
  'I found it hard to wind down.', 'I was aware of dryness of my mouth.', 'I could not seem to experience any positive feeling at all.',
  'I experienced breathing difficulty.', 'I found it difficult to work up the initiative to do things.', 'I tended to over-react to situations.',
  'I felt that I was using a lot of nervous energy.', 'I felt down-hearted and blue.', 'I found myself getting agitated.',
  'I felt I was close to panic.', 'I felt that I had nothing to look forward to.', 'I found myself getting upset by quite trivial things.',
  'I felt I was not worth much as a person.', 'I was intolerant of anything that kept me from getting on with what I was doing.', 'I felt scared without any good reason.',
  'I was unable to become enthusiastic about anything.', 'I felt I was not worth much as a person.', 'I felt that I was rather touchy.',
  'I was aware of the action of my heart in the absence of physical exertion.', 'I felt scared without any good reason.', 'I found life very meaningless.',
]
const dassSubscales = { depression: [2, 4, 9, 12, 15, 16, 20], anxiety: [1, 3, 6, 8, 14, 18, 19], stress: [0, 5, 7, 10, 11, 13, 17] }
const dassBand = (value: number, type: keyof typeof dassSubscales) => {
  const bands: [number, number, string][] = type === 'depression' ? [[0, 9, 'Normal'], [10, 13, 'Mild'], [14, 20, 'Moderate'], [21, 27, 'Severe'], [28, 100, 'Extremely severe']] : type === 'anxiety' ? [[0, 7, 'Normal'], [8, 9, 'Mild'], [10, 14, 'Moderate'], [15, 19, 'Severe'], [20, 100, 'Extremely severe']] : [[0, 14, 'Normal'], [15, 18, 'Mild'], [19, 25, 'Moderate'], [26, 33, 'Severe'], [34, 100, 'Extremely severe']]
  return bands.find(([min, max]) => value >= min && value <= max)?.[2] || 'Review'
}

function DassAssessment({ onClose }: { onClose: () => void }) {
  const [answers, setAnswers] = useState<number[]>(() => Array.from({ length: 21 }, () => 0))
  const [result, setResult] = useState<{ depression: number; anxiety: number; stress: number } | null>(null)
  const calculate = (event: FormEvent) => {
    event.preventDefault()
    const score = (items: number[]) => items.reduce((total, index) => total + answers[index], 0) * 2
    setResult({ depression: score(dassSubscales.depression), anxiety: score(dassSubscales.anxiety), stress: score(dassSubscales.stress) })
  }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="assessment-modal" role="dialog" aria-modal="true" aria-labelledby="dass-title"><div className="modal-heading"><div><p className="eyebrow">Private student check-in</p><h2 id="dass-title">DASS-21 screening</h2><p>Over the past week, choose how much each statement applied to you.</p></div><button className="close-button" onClick={onClose} aria-label="Close assessment"><X size={18} /></button></div>{result ? <div className="assessment-result"><div className="assessment-disclaimer"><ShieldCheck size={17} /><span>This is a non-diagnostic screening tool. Your answers stay in this browser and are not exported.</span></div><div className="assessment-scores">{(['depression', 'anxiety', 'stress'] as const).map((type) => <div className="assessment-score" key={type}><span>{type}</span><strong>{dassBand(result[type], type)}</strong><small>Score {result[type]}</small></div>)}</div><div className="ai-guidance"><Sparkles size={18} /><div><strong>AI growth guide</strong><p>{result.stress >= 19 || result.anxiety >= 10 ? 'Your signals suggest making space for a gentle reset: reduce the next task, take a short breathing break, and speak with someone you trust.' : 'Your signals look steady this week. Keep your routine small and visible, and notice which habits help you feel grounded.'}</p><small>This supportive reflection is generated from your screening bands, not a medical diagnosis.</small></div></div><button className="primary-button" onClick={onClose}>Return to my dashboard</button></div> : <form onSubmit={calculate}><div className="assessment-scale"><span>0 Never</span><span>1 Somewhat</span><span>2 Often</span><span>3 Very much</span></div><div className="assessment-questions">{dassQuestions.map((question, index) => <label key={`${index}-${question}`}><span><b>{index + 1}</b>{question}</span><select value={answers[index]} onChange={(event) => setAnswers((current) => current.map((value, itemIndex) => itemIndex === index ? Number(event.target.value) : value))}><option value={0}>0 · Never</option><option value={1}>1 · Sometimes</option><option value={2}>2 · Often</option><option value={3}>3 · Almost always</option></select></label>)}</div><div className="assessment-actions"><small>For reflection only. If you feel unsafe or overwhelmed, contact a trusted person or local professional support.</small><button type="submit" className="primary-button"><ClipboardCheck size={16} /> See my screening</button></div></form>}</section></div>
}

function ReportsView({ student, onGenerateSummary, canGenerateSummary, refreshKey }: { student: Student; onGenerateSummary: () => void; canGenerateSummary: boolean; refreshKey: number }) {
  const [history, setHistory] = useState<{ generated_by: string; student_email: string; created_at: string }[]>([])
  const [historyError, setHistoryError] = useState('')
  useEffect(() => {
    if (!canGenerateSummary) return
    const loadHistory = async () => {
      try {
        const response = await api.getReportHistory(student.email)
        setHistory(response.history || [])
        setHistoryError('')
      } catch (error) {
        setHistoryError(error instanceof Error ? error.message : 'Unable to load report history.')
      }
    }
    void loadHistory()
  }, [canGenerateSummary, refreshKey, student.email])

  return (
    <SectionFrame eyebrow="Reports workspace" title="Turn signals into a brief." description="Prepare a concise progress view for reviews, check-ins, and planning conversations.">
      <div className="report-grid">
        <DataPanel title="Term summary" eyebrow="Ready to share">
          <StatList items={[
            ['Student', student.name],
            ['Attendance', student.attendance !== null ? `${student.attendance}%` : 'Not recorded'],
            ['Academic average', student.gpa !== null ? `${student.gpa.toFixed(2)} / 10` : 'Not recorded'],
            ['Consistency', student.streak !== null ? `${student.streak} weeks` : 'Not recorded'],
          ]} />
          {canGenerateSummary ? <button className="primary-button report-action" onClick={onGenerateSummary}><BarChart3 size={16} /> Generate summary</button> : <p className="section-copy">Profile export is available only for faculty and advisor roles.</p>}
        </DataPanel>
        <DataPanel title="Report history" eyebrow="Recent exports">
          <div className="report-history">
            {historyError ? <p className="form-error" role="alert">{historyError}</p> : history.length ? history.map((item) => <div key={`${item.generated_by}-${item.created_at}`}><strong>Progress summary</strong><span>{new Date(item.created_at).toLocaleString()} · {item.generated_by}</span></div>) : <p className="section-copy">No reports have been exported for this student.</p>}
          </div>
        </DataPanel>
      </div>
    </SectionFrame>
  )
}

function ProgressHistoryView({ student }: { student: Student }) {
  const [history, setHistory] = useState<ProgressHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadHistory = async () => {
      setLoading(true)
      try {
        const response = await api.getProgressHistory(student.email)
        if (!cancelled) {
          setHistory(response.history)
          setError('')
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load progress history.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (student.email) void loadHistory()
    return () => { cancelled = true }
  }, [student.email])

  const chartData = history.map((record) => ({
    ...record,
    date: new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(record.recorded_at)),
  }))

  return <SectionFrame eyebrow="Academic progress" title="Progress, grounded in your record." description="Only verified updates are plotted. No earlier values are inferred or generated.">
    <DataPanel title="Recorded progress history" eyebrow={history.length ? `${history.length} verified update${history.length === 1 ? '' : 's'}` : 'History'}>
      {loading ? <p className="section-copy" role="status">Loading your progress history…</p> : error ? <p className="form-error" role="alert">{error}</p> : history.length === 0 ? <p className="section-copy">No historical progress data is available yet. Verified updates will appear here when recorded.</p> : <div className="progress-history-chart" role="img" aria-label="Chart of recorded attendance, skills growth and academic average over time">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e1d8" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="percentage" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="gpa" orientation="right" domain={[0, 10]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line yAxisId="percentage" type="monotone" dataKey="attendance" name="Attendance %" stroke="#4c9b91" connectNulls dot />
            <Line yAxisId="percentage" type="monotone" dataKey="skills" name="Skills growth %" stroke="#ef765e" connectNulls dot />
            <Line yAxisId="gpa" type="monotone" dataKey="gpa" name="Academic average" stroke="#d4a54c" connectNulls dot />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      {!loading && !error && history.length > 0 && <p className="section-copy history-note">Attendance and skills use the left scale; academic average uses the right scale. Missing values are left blank.</p>}
    </DataPanel>
  </SectionFrame>
}

function SectionView({ active, student, onGenerateSummary, canGenerateSummary, reportRefreshKey }: { active: string; student: Student; onGenerateSummary: () => void; canGenerateSummary: boolean; reportRefreshKey: number }) {
  if (active === 'Reports') return <ReportsView student={student} onGenerateSummary={onGenerateSummary} canGenerateSummary={canGenerateSummary} refreshKey={reportRefreshKey} />
  if (active === 'Progress') return <ProgressHistoryView student={student} />
  const academicSubjects = student.subjects
  const flow = student.growthFlow || []
  const hasAttendance = student.attendance !== null
  const hasGpa = student.gpa !== null
  const hasSkills = student.skills !== null
  const hasStreak = student.streak !== null

  if (active === 'Attendance') return <SectionFrame eyebrow="Attendance record" title="Show up, then grow." description="A clear view of the latest recorded attendance signal.">
    <div className="section-grid">
      <DataPanel title="Current attendance" eyebrow={hasAttendance ? 'Latest recorded value' : 'No record yet'}>
        <div className="current-progress">
          <div className="current-progress-heading"><strong>{hasAttendance ? `${student.attendance}%` : 'Not recorded'}</strong><span>Attendance</span></div>
          {student.attendance !== null && <div className="progress-track"><i style={{ width: `${Math.min(student.attendance, 100)}%` }} /></div>}
        </div>
        <p className="section-copy">{hasAttendance ? 'This is the current attendance value on file. Use Progress to view verified updates over time.' : 'No attendance data has been recorded yet.'}</p>
      </DataPanel>
      <DataPanel title="Attendance record details" eyebrow="Current snapshot">
        <StatList items={[['Record status', hasAttendance ? 'Recorded' : 'Awaiting record'], ['Historical data', 'See Progress']]} />
      </DataPanel>
    </div>
    <DataPanel title="Attendance notes" eyebrow="Context"><p className="section-copy">{student.progressNotes || 'No attendance-specific context has been recorded.'}</p></DataPanel>
  </SectionFrame>
  if (active === 'Academics') return <SectionFrame eyebrow="Academic record" title="Make the learning visible." description="Subjects, academic average, and the context recorded for this student.">
    <div className="section-grid">
      <DataPanel title="Subject portfolio" eyebrow={academicSubjects.length ? 'Registered subjects' : 'No subjects listed'}>
        {academicSubjects.length ? <div className="subject-list">{academicSubjects.map((subject, index) => <div className="subject-row" key={`${subject}-${index}`}><span className="subject-number">{String(index + 1).padStart(2, '0')}</span><strong>{subject}</strong></div>)}</div> : <p className="section-copy">No subjects have been added to this profile.</p>}
      </DataPanel>
      <DataPanel title="Academic snapshot" eyebrow="Current record">
        <StatList items={[['Academic average', student.gpa !== null ? `${student.gpa.toFixed(2)} / 10` : 'Not recorded'], ['Course', student.course], ['Year', student.year]]} />
      </DataPanel>
    </div>
    <DataPanel title="Learning note" eyebrow="Recorded context"><p className="section-copy">{student.progressNotes || 'No academic context has been recorded.'}</p></DataPanel>
  </SectionFrame>
  if (active === 'Skills & consistency') return <SectionFrame eyebrow="Capability map" title="Practice becomes momentum." description="Review the recorded skills signal, goals, and consistency streak.">
    <div className="section-grid">
      <DataPanel title="Skills growth" eyebrow={hasSkills ? 'Current profile' : 'No assessment yet'}>
        <div className="current-progress">
          <div className="current-progress-heading"><strong>{hasSkills ? `${student.skills}%` : 'Not recorded'}</strong><span>Overall skills growth</span></div>
          {student.skills !== null && <div className="progress-track"><i style={{ width: `${Math.min(student.skills, 100)}%` }} /></div>}
        </div>
        <p className="section-copy">{student.interests.length ? 'Skills and interests the student wants to develop:' : 'No skill-development goals have been added.'}</p>
        {student.interests.length > 0 && <div className="goal-list">{student.interests.map((interest, index) => <span key={`${interest}-${index}`}>{interest}</span>)}</div>}
      </DataPanel>
      <DataPanel title="Consistency pulse" eyebrow="Current record">
        <div className="consistency-score"><strong>{student.streak !== null ? student.streak : 'Not recorded'}</strong><span>{student.streak !== null ? 'weeks in the current streak' : 'No streak has been recorded'}</span></div>
        <StatList items={[['Latest progress note', student.progressNotes || 'Not recorded'], ['Check-in rhythm', 'Not recorded']]} />
      </DataPanel>
    </div>
    <DataPanel title="Next small move" eyebrow="Suggested focus"><p className="section-copy">{student.interests.length ? `Choose one goal, such as ${student.interests[0]}, and record evidence after the next practice session.` : 'Add a skill-development goal, then record evidence after a practice session.'}</p></DataPanel>
  </SectionFrame>
  if (active === 'Well-being') return <SectionFrame eyebrow="Well-being check-in" title="Progress needs a pulse." description="A private, low-pressure view of the latest self-reported well-being status.">
    <div className="section-grid">
      <DataPanel title="Current check-in" eyebrow={student.wellbeing === 'Not recorded' ? 'No check-in yet' : 'Self-reported'}>
        <div className="wellbeing-status"><span className="status-indicator" /><strong>{student.wellbeing}</strong></div>
        <p className="section-copy">{student.wellbeing === 'Not recorded' ? 'Well-being is optional. A student can add a check-in whenever they are ready.' : 'This is a self-reported status, not a clinical assessment or diagnostic score.'}</p>
      </DataPanel>
      <DataPanel title="Support signals" eyebrow="Advisor view"><StatList items={[['Well-being status', student.wellbeing], ['Privacy', 'Student-led'], ['Last check-in', 'Not recorded']]} /></DataPanel>
    </div>
    <DataPanel title="Care note" eyebrow="Context"><p className="section-copy">Well-being signals are optional. Use a conversation, not a score, as the starting point for support.</p></DataPanel>
  </SectionFrame>
  if (active === 'Achievements') return <SectionFrame eyebrow="Proof points" title="Keep the evidence close." description="Review achievements and progress updates that have actually been recorded.">
    <div className="achievement-list">{student.latestAchievement ? <Achievement icon="⌁" title={student.latestAchievement} meta={student.achievementMeta || 'Recorded progress update'} color="coral" /> : <p className="section-copy">No achievements have been recorded yet.</p>}</div>
    <DataPanel title="Growth flow" eyebrow="Recorded journey">
      {flow.length ? <div className="section-timeline">{flow.map((item) => <div className="timeline-item" key={`${item.title}-${item.time}`}><span className={`timeline-dot ${item.color}`} /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></div>)}</div> : <p className="section-copy">No progress milestones have been recorded yet.</p>}
    </DataPanel>
  </SectionFrame>
  return <SectionFrame eyebrow="Workspace settings" title="Shape the workspace." description="Control the way this prototype presents student progress and support signals."><div className="settings-list"><div className="setting-row"><span><strong>Weekly progress reminders</strong><small>Keep a gentle check-in rhythm for active students.</small></span><button className="toggle on" aria-label="Weekly progress reminders enabled"><i /></button></div><div className="setting-row"><span><strong>Well-being signals</strong><small>Show optional well-being panels in student views.</small></span><button className="toggle on" aria-label="Well-being signals enabled"><i /></button></div><div className="setting-row"><span><strong>Privacy-first mode</strong><small>Use fictional data only while this prototype is local.</small></span><button className="toggle on" aria-label="Privacy-first mode enabled"><i /></button></div></div></SectionFrame>
}

function SectionFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <section className="section-view"><div className="section-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{children}</section> }
function DataPanel({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) { return <div className="section-panel"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children}</div> }
function StatList({ items }: { items: [string, string][] }) { return <div className="stat-list">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div> }

function App() {
  const shareMode = __THRIVE_SHARE_MODE__
  const [studentList, setStudentList] = useState<Student[]>([])
  const [student, setStudent] = useState<Student>(emptyStudent)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Overview')
  const [role, setRole] = useState<UserRole>(shareMode ? 'Student' : 'Advisor')
  const [accountType, setAccountType] = useState<UserRole>(shareMode ? 'Student' : 'Advisor')
  const [accountName, setAccountName] = useState('')
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true)
  const [directoryError, setDirectoryError] = useState('')
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [reportRefreshKey, setReportRefreshKey] = useState(0)
  const canExportProfile = role !== 'Student'
  const [authenticated, setAuthenticated] = useState(shareMode)
  const [authPage, setAuthPage] = useState<'entrance' | 'register' | 'login' | 'activate'>('entrance')
  const [registrationRole, setRegistrationRole] = useState<RegistrationRole>('Student')
  const [accountOpen, setAccountOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<{ id: number; title: string; detail: string; time: string; read: boolean }[]>([])
  const [profileOpen, setProfileOpen] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressDraft, setProgressDraft] = useState<ProgressDraft>({ attendance: '', gpa: '', skills: '', streak: '', subject: '', achievement: '', wellbeing: 'Not recorded', notes: '' })
  const [progressError, setProgressError] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginRole, setLoginRole] = useState('Student')
  const [loginError, setLoginError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [activation, setActivation] = useState({ email: '', code: '', password: '' })
  const [chatOpen, setChatOpen] = useState(false)
  const [assessmentOpen, setAssessmentOpen] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)
  const [registration, setRegistration] = useState<RegistrationDraft>({ name: '', reg: '', email: '', password: '', course: '', year: '', section: '', subjects: '', interests: '', details: '', department: '', employeeId: '' })
  const [registrationError, setRegistrationError] = useState('')
  const [staffReport, setStaffReport] = useState({ email: '', attendance: '', gpa: '', skills: '', streak: '', subject: '', achievement: '', wellbeing: 'Not recorded', notes: '' })
  const [staffReportError, setStaffReportError] = useState('')
  const [staffReportSaved, setStaffReportSaved] = useState('')
  const [reportExportError, setReportExportError] = useState('')
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(['Ask about your recorded progress or general study planning. University policies and dates are not available in this assistant yet.'])
  const [isAssistantThinking, setIsAssistantThinking] = useState(false)
  useEffect(() => {
    if (studentList.length && (!staffReport.email || !studentList.some((student) => student.email === staffReport.email))) {
      setStaffReport((current) => ({ ...current, email: studentList[0].email }))
    }
  }, [staffReport.email, studentList])
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthenticated(false)
      setAuthPage('login')
      setLoginError('Your session has expired. Sign in again to continue.')
      setLoginPassword('')
    }
    window.addEventListener('student-thrive-auth-expired', handleAuthExpired)
    return () => window.removeEventListener('student-thrive-auth-expired', handleAuthExpired)
  }, [])
  useEffect(() => {
    if (!authenticated) return
    const loadStudentDirectory = async () => {
      try {
        const response = await api.listStudents()
        const nextStudents = (response.students || []).map(mapApiStudent)
        setStudentList(nextStudents)
        if (nextStudents.length) {
          setStudent(nextStudents[0])
        } else if (role !== 'Student') {
          setStudent(emptyStudent)
        }
        setDirectoryError('')
      } catch (error) {
        setDirectoryError(error instanceof Error ? error.message : 'Unable to load student records.')
      } finally {
        setIsLoadingDirectory(false)
      }
    }
    void loadStudentDirectory()
  }, [authenticated, role])
  useEffect(() => {
    const token = window.localStorage.getItem('student-thrive-auth-token')
    if (!token) return
    let cancelled = false
    const restoreSession = async () => {
      try {
        const response = await api.getMe()
        if (cancelled) return
        const user = mapApiStudent(response.user)
        setRole(response.user.role)
        setAccountType(response.user.role)
        setAccountName(response.user.name)
        setStudent(user)
        setStudentList(response.user.role === 'Student' ? [user] : [])
        setAuthenticated(true)
        setMessages([`Hi! I can help you understand ${user.name.split(' ')[0]}'s progress, spot patterns, or suggest next steps.`])
      } catch {
        // The request handler clears invalid or expired tokens.
      }
    }
    void restoreSession()
    return () => { cancelled = true }
  }, [])
  const matches = useMemo(() => studentList.filter((item) => `${item.name} ${item.reg}`.toLowerCase().includes(query.toLowerCase())), [query, studentList])
  const changedInsights = [{ title: 'Attendance record', detail: student.attendance !== null ? `The latest attendance value on file is ${student.attendance}%.` : 'No attendance value has been recorded yet.', evidence: student.attendance !== null ? `Current attendance · ${student.attendance}%` : 'Attendance record · Not recorded' }, { title: 'Academic profile', detail: student.gpa !== null ? `The latest academic average on file is ${student.gpa.toFixed(2)} out of 10.` : 'No academic average has been recorded yet.', evidence: student.gpa !== null ? `Academic average · ${student.gpa.toFixed(2)} / 10` : 'Academic record · Not recorded' }]
  const hasAttendance = student.attendance !== null
  const hasGpa = student.gpa !== null
  const hasSkills = student.skills !== null
  const hasStreak = student.streak !== null
  const unreadNotifications = notifications.filter((item) => !item.read).length
  const isStaff: boolean = role === 'Faculty' || role === 'Advisor'
  const selectedStaffStudent = studentList.find((item) => item.email === staffReport.email) ?? studentList[0]
  const selectStudent = (next: Student) => { setStudent(next); setQuery(''); setMessages([`Hi! I can help you understand ${next.name.split(' ')[0]}'s progress, spot patterns, or suggest next steps.`]) }
  const handleStaffReportSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const attendance = Number(staffReport.attendance)
    const gpa = Number(staffReport.gpa)
    const skills = Number(staffReport.skills)
    const streak = Number(staffReport.streak)
    if (!staffReport.email || [staffReport.attendance, staffReport.gpa, staffReport.skills, staffReport.streak].some((value) => value === '') || [attendance, gpa, skills, streak].some(Number.isNaN) || attendance < 0 || attendance > 100 || gpa < 0 || gpa > 10 || skills < 0 || skills > 100 || streak < 0) {
      setStaffReportError('Select a valid student and complete all numeric fields.')
      return
    }
    const targetStudent = selectedStaffStudent ?? studentList[0]
    if (!targetStudent) {
      setStaffReportError('No student directory data is available yet. Please wait for the list to load.')
      return
    }
    try {
      const response = await api.saveProgress({
          email: staffReport.email,
          attendance,
          gpa,
          skills,
          streak,
          subject: staffReport.subject.trim(),
          achievement: staffReport.achievement.trim(),
          wellbeing: staffReport.wellbeing.trim() || 'Not recorded',
          notes: staffReport.notes.trim(),
      })
      const nextStudent = { ...targetStudent, attendance, gpa, skills, streak, wellbeing: response.progress.wellbeing || staffReport.wellbeing, latestAchievement: response.progress.achievement || undefined, progressSubject: response.progress.subject || undefined, progressNotes: response.progress.notes || undefined }
      setStudentList((current) => current.map((item) => item.email === nextStudent.email ? nextStudent : item))
      setStudent(nextStudent)
      setStaffReportSaved(`Report saved for ${nextStudent.name}.`)
      setStaffReportError('')
    } catch (error) {
      setStaffReportError(error instanceof Error ? error.message : 'Could not save the academic report.')
      setStaffReportSaved('')
    }
  }
  const openProgress = () => { setProgressDraft({ attendance: student.attendance !== null ? String(student.attendance) : '', gpa: student.gpa !== null ? String(student.gpa) : '', skills: student.skills !== null ? String(student.skills) : '', streak: student.streak !== null ? String(student.streak) : '', subject: student.progressSubject || '', achievement: student.latestAchievement || '', wellbeing: student.wellbeing, notes: student.progressNotes || '' }); setProgressError(''); setProgressOpen(true) }
  const saveProgress = async (event: React.FormEvent) => {
    event.preventDefault()
    const attendance = Number(progressDraft.attendance); const gpa = Number(progressDraft.gpa); const skills = Number(progressDraft.skills); const streak = Number(progressDraft.streak)
    if ([attendance, gpa, skills, streak].some((value) => Number.isNaN(value)) || attendance < 0 || attendance > 100 || gpa < 0 || gpa > 10 || skills < 0 || skills > 100 || streak < 0) { setProgressError('Enter valid values: attendance and skills 0–100, academic average 0–10, and a non-negative streak.'); return }
    try {
      const response = await api.saveProgress({
          email: student.email,
          attendance,
          gpa,
          skills,
          streak,
          subject: progressDraft.subject.trim(),
          achievement: progressDraft.achievement.trim(),
          wellbeing: progressDraft.wellbeing.trim() || 'Not recorded',
          notes: progressDraft.notes.trim(),
      })
      const updated = { ...student, attendance, gpa, skills, streak, wellbeing: response.progress.wellbeing || progressDraft.wellbeing || 'Not recorded', latestAchievement: response.progress.achievement || student.latestAchievement, progressSubject: response.progress.subject || student.progressSubject, progressNotes: response.progress.notes || student.progressNotes }
      setStudent(updated); setStudentList((current) => current.map((item) => item.reg === updated.reg ? updated : item)); setProgressOpen(false)
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : 'Update failed. Please try again.')
    }
  }
  const registerStudent = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedReg = registration.reg.trim().toUpperCase()
    const normalizedEmail = registration.email.trim().toLowerCase()
    if (isSubmittingAuth) return
    if (registrationRole !== 'Student') {
      setRegistrationError('Faculty and advisor accounts must be provisioned by an administrator.')
      return
    }
    if (!registration.name.trim() || !normalizedEmail || !registration.password.trim()) { setRegistrationError('Name, email, and password are required.'); return }
    if (registrationRole === 'Student' && (!/^(?:241FA\d{5,}|251LA\d{5,}|2\d{7,})$/.test(normalizedReg) || !registration.course.trim() || !registration.interests.trim())) { setRegistrationError('Use a registration number such as 241FA20019, 251LA20001, or another number beginning with 2.'); return }
    setIsSubmittingAuth(true)
    try {
      await api.register({
        role: 'Student',
        name: registration.name.trim(),
        email: normalizedEmail,
        password: registration.password,
        reg: normalizedReg,
        course: registration.course.trim(),
        year: registration.year || undefined,
        section: registration.section || undefined,
        subjects: registration.subjects,
        interests: registration.interests,
        details: registration.details,
      })
      setRegistration({ name: '', reg: '', email: '', password: '', course: '', year: '', section: '', subjects: '', interests: '', details: '', department: '', employeeId: '' }); setRegistrationError(''); setRegistrationOpen(false); setAuthPage('login'); setLoginRole('Student'); setLoginEmail(normalizedEmail); setLoginError(''); setLoginNotice('Student profile created. Sign in with your new credentials.')
    } catch (error) {
      setRegistrationError(error instanceof Error ? error.message : 'Registration failed.')
    } finally {
      setIsSubmittingAuth(false)
    }
  }
  const activateAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (isSubmittingAuth) return
    setIsSubmittingAuth(true)
    setLoginError('')
    try {
      const response = await api.activate(activation)
      setLoginEmail(activation.email)
      setLoginPassword('')
      setActivation({ email: '', code: '', password: '' })
      setLoginError('')
      setLoginNotice(response.message)
      setAuthPage('login')
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Account activation failed. Check your code and try again.')
    } finally {
      setIsSubmittingAuth(false)
    }
  }
  const signIn = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmittingAuth) return
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Enter your email and password to continue.')
      return
    }
    const normalizedEmail = loginEmail.trim().toLowerCase()
    setIsSubmittingAuth(true)
    try {
      const response = await api.login({ email: normalizedEmail, password: loginPassword, role: parseRole(loginRole) })
      const user = mapApiStudent(response.user)
      window.localStorage.setItem('student-thrive-auth-token', response.token)
      setRole(response.user.role)
      setAccountType(response.user.role)
      setAccountName(response.user.name)
      setStudent(user)
      setStudentList(response.user.role === 'Student' ? [user] : [])
      setAuthenticated(true)
      setLoginError('')
      setLoginNotice('')
      setMessages(['Ask about your recorded progress or general study planning. University policies and dates are not available in this assistant yet.'])
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign in failed. Check your details and try again.')
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  const generateSummary = async (email: string) => {
    if (role === 'Student') return
    try {
      const response = await api.generateReport(email, role)
      const file = new Blob([response.content], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = response.filename
      link.click()
      URL.revokeObjectURL(url)
      setReportExportError('')
      setReportRefreshKey((current) => current + 1)
    } catch (error) {
      setReportExportError(error instanceof Error ? error.message : 'Report generation failed.')
    }
  }

  if (!authenticated && authPage === 'entrance') return <div className="login-shell"><div className="login-art"><UniversityBrand /><div className="hero-copy"><p className="eyebrow">AI-powered student success portal</p><h1>Empowering students to learn, grow and thrive.</h1><p>A secure space for student progress, learning support, and faculty visibility.</p></div><div className="login-signal"><ShieldCheck size={18} /><span><strong>Support, grounded in your record</strong><small>Vignan University · Student Thrive</small></span></div></div><section className="login-card"><div className="login-card-heading"><p className="eyebrow">Welcome</p><h2>Student support, in one place.</h2><p>Sign in with your university account or create a student profile.</p></div><button type="button" className="role-option" onClick={() => { setRegistrationRole('Student'); setAuthPage('register') }}><div className="role-option-icon coral"><GraduationCap size={16} /></div><div><strong>Student registration</strong><small>Create your personal growth profile</small></div><Plus size={16} /></button><button type="button" className="primary-button login-button" onClick={() => { setLoginRole('Student'); setAuthPage('login') }}><LogIn size={16} /> Student sign in</button><div className="staff-signin"><p>Faculty and advisors</p><button type="button" className="text-button" onClick={() => { setLoginRole('Faculty'); setAuthPage('login') }}>Faculty sign in</button><button type="button" className="text-button" onClick={() => { setLoginRole('Advisor'); setAuthPage('login') }}>Advisor sign in</button></div><p className="login-help"><ShieldCheck size={14} /> Secure, role-based access</p></section></div>
  if (!authenticated && authPage === 'register') return <RegistrationPage draft={registration} error={registrationError} role={registrationRole} onChange={setRegistration} onSubmit={registerStudent} onClose={() => { setAuthPage('entrance'); setRegistrationError('') }} onLogin={() => { setAuthPage('login'); setLoginRole(registrationRole); setRegistrationError('') }} />
  if (!authenticated && authPage === 'activate') return <div className="login-shell"><div className="login-art"><UniversityBrand /><div><p className="eyebrow">Student account setup</p><h1>Activate your university profile.</h1><p>Enter the one-time code provided by your authorized faculty or advisor, then choose a password.</p></div></div><form className="login-card" onSubmit={activateAccount}><div className="login-card-heading"><p className="eyebrow">Imported student account</p><h2>Set your password</h2></div><label>University email<input type="email" required value={activation.email} onChange={(event) => setActivation({ ...activation, email: event.target.value })} /></label><label>One-time activation code<input required minLength={32} value={activation.code} onChange={(event) => setActivation({ ...activation, code: event.target.value })} /></label><label>New password<input type="password" required minLength={8} value={activation.password} onChange={(event) => setActivation({ ...activation, password: event.target.value })} /></label>{loginError && <p className="form-error" role="alert">{loginError}</p>}<button type="submit" className="primary-button login-button" disabled={isSubmittingAuth}>{isSubmittingAuth ? 'Activating…' : 'Activate account'}</button><button type="button" className="text-button" onClick={() => { setAuthPage('login'); setLoginError('') }}>Back to sign in</button></form></div>
  if (!authenticated) return <div className="login-shell"><div className="login-art"><UniversityBrand /><div><p className="eyebrow">AI-powered student success portal</p><h1>Empowering students to learn, grow and thrive.</h1><p>Secure access to recorded academics, attendance, skills and student support.</p></div><div className="login-signal"><ShieldCheck size={18} /><span><strong>Vignan University</strong><small>Role-based, private student records</small></span></div></div><form className="login-card" onSubmit={signIn}><div className="login-card-heading"><p className="eyebrow">Welcome back</p><h2>Sign in to Student Thrive</h2><p>Your role controls which student records and tools you can access.</p></div><label>Account role<select value={loginRole} onChange={(event) => setLoginRole(event.target.value)}><option>Student</option><option>Faculty</option><option>Advisor</option></select></label><label>University email<input type="email" autoComplete="username" required value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} placeholder="you@institution.edu" /></label><label>Password<input type="password" autoComplete="current-password" required value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter your password" /></label>{loginError && <p className="form-error" role="alert"><CircleHelp size={14} /> {loginError}</p>}<button type="submit" className="primary-button login-button" disabled={isSubmittingAuth}><LogIn size={16} /> {isSubmittingAuth ? 'Signing in…' : `Sign in as ${loginRole}`}</button>{loginNotice && <p className="save-success" role="status">{loginNotice}</p>}<button type="button" className="text-button" onClick={() => { setAuthPage('register'); setRegistrationRole('Student'); setLoginError('') }}>New student? Register first</button><button type="button" className="text-button" onClick={() => { setAuthPage('activate'); setActivation({ email: loginEmail, code: '', password: '' }); setLoginError('') }}>Have an import activation code?</button><small className="login-help">Forgot password? Contact your authorized university administrator.</small></form></div>
  if (registrationOpen) return <RegistrationPage draft={registration} error={registrationError} role={registrationRole} onChange={setRegistration} onSubmit={registerStudent} onClose={() => { setRegistrationOpen(false); setRegistrationError('') }} onLogin={() => { setRegistrationOpen(false); setAuthPage('login'); setLoginRole(registrationRole); setRegistrationError('') }} />
  const refreshDirectory = async () => {
    const response = await api.listStudents()
    const nextStudents = (response.students || []).map(mapApiStudent)
    setStudentList(nextStudents)
    if (nextStudents.length) {
      const currentStudent = nextStudents.find((item) => item.email === staffReport.email) ?? nextStudents[0]
      setStudent(currentStudent)
      setStaffReport((current) => ({ ...current, email: currentStudent.email }))
    } else {
      setStudent(emptyStudent)
      setStaffReport((current) => ({ ...current, email: '' }))
    }
  }
  if (progressOpen) return <ProgressPage studentName={student.name} registrationNumber={student.reg} draft={progressDraft} error={progressError} onChange={setProgressDraft} onSubmit={saveProgress} onClose={() => setProgressOpen(false)} />
  if (isStaff) return <StaffDashboard role={role === 'Advisor' ? 'Advisor' : 'Faculty'} studentList={studentList} selectedStudent={selectedStaffStudent} staffReport={staffReport} setStaffReport={setStaffReport} onSubmit={handleStaffReportSubmit} error={staffReportError} reportExportError={reportExportError} onGenerateSummary={() => selectedStaffStudent && generateSummary(selectedStaffStudent.email)} reportRefreshKey={reportRefreshKey} savedMessage={staffReportSaved} onDismissNotice={() => setStaffReportSaved('')} onStudentsImported={refreshDirectory} directoryLoading={isLoadingDirectory} directoryError={directoryError} accountName={accountName} />
  const sendMessage = async () => {
    const question = message.trim()
    if (!question || isAssistantThinking) return
    setMessages((current) => [...current, question])
    setMessage('')
    setIsAssistantThinking(true)
    try {
      const response = await api.askAssistant(question, role !== 'Student' && student.email ? student.email : undefined)
      setMessages((current) => [...current, response.answer])
    } catch (error) {
      setMessages((current) => [...current, error instanceof Error ? error.message : 'Student Thrive AI is temporarily unavailable. Please try again.'])
    } finally {
      setIsAssistantThinking(false)
    }
  }

  return <div className="app-shell">
    <aside className={sidebarOpen ? 'sidebar sidebar-open' : 'sidebar'}>
      <UniversityBrand compact />
      <div className="workspace-label">Workspace <ChevronDown size={14} /></div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(label); setSidebarOpen(false) }}><Icon size={18} /><span>{label}</span>{label === 'Well-being' && <span className="optional">optional</span>}</button>)}</nav>
      <div className="sidebar-bottom">{canExportProfile && <button className={active === 'Reports' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Reports')}><BarChart3 size={18} /><span>Reports</span></button>}<button className={active === 'Settings' ? 'nav-item active' : 'nav-item'} onClick={() => setActive('Settings')}><Settings size={18} /><span>Settings</span></button><div className="access-note"><ShieldCheck size={16} /><span><strong>Authorized access</strong><small>Student data is protected</small></span></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle navigation"><Menu size={20} /></button>
        <div className="breadcrumb"><span>{role === 'Student' ? 'My space' : role === 'Faculty' ? 'Faculty workspace' : 'Student success'}</span><span>/</span><strong>{active}</strong></div>
        <div className="top-actions">
          <div className="notification-wrap">
            <button className="icon-button" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Toggle notifications">{unreadNotifications > 0 && <i />}<Bell size={19} /></button>
            {notificationsOpen && <div className="notification-panel" role="menu" aria-label="Notifications"><div className="notification-header"><strong>Notifications</strong></div><div className="notification-list">{notifications.length ? notifications.map((item) => <button type="button" className={item.read ? 'notification-item read' : 'notification-item'} key={item.id} onClick={() => setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry))}><div className="notification-dot" aria-hidden="true" /><div><strong>{item.title}</strong><span>{item.detail}</span><small>{item.time}</small></div></button>) : <p className="section-copy">No notifications yet.</p>}</div></div>}
          </div>
          <div className="role-select"><Users size={16} /><select value={role} disabled aria-label="Account role"><option>{role}</option></select><ChevronDown size={14} /></div>
          <div className="account-wrap">
            <button className="avatar small" onClick={() => setAccountOpen((value) => !value)} aria-label="Open account menu">{accountName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'ST'}</button>
            {accountOpen && <div className="account-menu"><strong>{accountName || 'Account'}</strong><small>{accountType} account</small><button onClick={() => { window.localStorage.removeItem('student-thrive-auth-token'); setAuthenticated(false); setAccountOpen(false); setAccountName(''); setStudentList([]); setStudent(emptyStudent); setLoginRole(accountType); setAuthPage('login') }}><LogOut size={14} /> Log out</button></div>}
          </div>
        </div>
      </header>
      <div className="content-wrap">
        {student.isDemo && <div className="demo-banner" role="status"><ShieldCheck size={16} /><span>Development demo data — these records are fictional and are not university student records.</span></div>}
        {directoryError && role === 'Student' && <p className="form-error" role="alert">{directoryError}</p>}
        {isLoadingDirectory && role === 'Student' && <p className="section-copy" role="status">Loading your progress…</p>}
        {active === 'Overview' ? <>
        <section className="hero-row"><div><p className="eyebrow">{new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</p><h1>Your <em>growth story.</em></h1><p className="hero-copy">One clear view of the signals that help {student.name.split(' ')[0]} keep moving forward.</p>{isLoadingDirectory && <small className="form-note">Loading student directory…</small>}</div></section>
        <section className="insight-strip">
          <div className="insight-card coral"><span>Academic average</span><strong>{hasGpa ? `${student.gpa?.toFixed(1)}/10` : '—'}</strong><small>{hasGpa ? 'latest recorded value' : 'not recorded'}</small></div>
          <div className="insight-card teal"><span>Attendance</span><strong>{hasAttendance ? `${student.attendance}%` : '—'}</strong><small>{hasAttendance ? 'latest recorded value' : 'not recorded'}</small></div>
          <div className="insight-card gold"><span>Skills to develop</span><strong>{student.interests[0] || 'Not listed'}</strong><small>{student.interests.length ? 'student-selected goal' : 'no goals recorded'}</small></div>
        </section>
        {role === 'Student' && <section className="ai-student-panel"><div className="ai-student-copy"><p className="eyebrow"><Sparkles size={14} /> Personal growth guide</p><h2>Your next step can be small.</h2><p>Use a private check-in to reflect on stress, mood, and energy. The guide turns your answers into gentle, practical suggestions.</p><div className="ai-student-actions"><button className="primary-button" onClick={() => setAssessmentOpen(true)}><ClipboardCheck size={16} /> Take DASS check-in</button><button className="outline-button" onClick={() => setChatOpen(true)}><Bot size={16} /> Ask the AI guide</button></div></div><div className="ai-student-signal"><div className="ai-signal-icon"><Sparkles size={23} /></div><strong>Private by design</strong><span>Screening answers stay on this device and never become a staff report.</span></div></section>}
        <section className="journey-map-section">
          <div className="journey-heading"><div><p className="eyebrow">Current snapshot</p><h2>Growth signals on file.</h2><p>These are the latest recorded values. Open Progress to see verified updates over time.</p></div><span className="journey-status"><CheckCircle2 size={15} /> Current record</span></div>
          <div className="current-signal-grid"><article><span>Attendance</span><strong>{hasAttendance ? `${student.attendance}%` : 'Not recorded'}</strong></article><article><span>Academic average</span><strong>{hasGpa ? `${student.gpa?.toFixed(1)} / 10` : 'Not recorded'}</strong></article><article><span>Skills growth</span><strong>{hasSkills ? `${student.skills}%` : 'Not recorded'}</strong></article><article><span>Well-being</span><strong>{student.wellbeing}</strong></article></div>
        </section>
        <section className="changed-section"><div className="journey-heading"><div><p className="eyebrow">Your Thrive Insights</p><h2>What is currently known.</h2><p>Each insight is derived from your recorded profile. Add academic data to receive more personalized context.</p></div></div><div className="changed-grid">{changedInsights.map((insight, index) => <InsightCard key={insight.title} title={insight.title} detail={insight.detail} evidence={insight.evidence} tone={index === 0 ? 'coral' : 'teal'} />)}</div></section>
        <section className="student-strip"><div className="student-id"><div className="avatar" style={{ background: student.accent }}>{student.initials}</div><div><h2>{student.name}</h2><p>{student.reg} · {student.course} · {student.year}</p></div></div><div className="student-actions"><button className="outline-button" onClick={() => setProfileOpen(true)}><CircleHelp size={16} /> View profile</button>{role !== 'Student' && <button className="primary-button" onClick={openProgress}><Activity size={16} /> Record progress</button>}</div></section>
        <section className="metrics-grid"><Metric label="Attendance" value={hasAttendance ? `${student.attendance}%` : 'Not recorded'} detail={hasAttendance ? 'Latest recorded value' : 'No attendance data yet'} icon={<CalendarCheck2 />} tone="coral" /><Metric label="Academic average" value={student.gpa?.toFixed(1) ?? 'Not recorded'} suffix={hasGpa ? '/ 10' : ''} detail={hasGpa ? 'Latest recorded value' : 'No academic average yet'} icon={<GraduationCap />} tone="teal" /><Metric label="Consistency streak" value={student.streak ?? 'Not recorded'} suffix={hasStreak ? ' weeks' : ''} detail={hasStreak ? 'Current recorded streak' : 'No streak recorded yet'} icon={<Activity />} tone="gold" /><Metric label="Skills growth" value={hasSkills ? `${student.skills}%` : 'Not recorded'} detail={hasSkills ? 'Latest recorded value' : 'No skills assessment yet'} icon={<TrendingUp />} tone="lilac" /></section>
        <section className="dashboard-grid"><div className="panel trend-panel"><div className="panel-heading"><div><p className="eyebrow">Progress records</p><h3>Current academic signals</h3></div></div><StatList items={[['Academic average', hasGpa ? `${student.gpa?.toFixed(2)} / 10` : 'Not recorded'], ['Attendance', hasAttendance ? `${student.attendance}%` : 'Not recorded'], ['Skills growth', hasSkills ? `${student.skills}%` : 'Not recorded'], ['Consistency streak', hasStreak ? `${student.streak} weeks` : 'Not recorded']]} /></div><div className="panel skills-panel"><div className="panel-heading"><div><p className="eyebrow">Student-selected</p><h3>Skills to develop</h3></div></div>{student.interests.length ? <div className="goal-list">{student.interests.map((interest, index) => <span key={`${interest}-${index}`}>{interest}</span>)}</div> : <p className="section-copy">No development goals have been recorded.</p>}</div></section>
        <section className="lower-grid"><div className="panel achievements"><div className="panel-heading"><div><p className="eyebrow">Proof points</p><h3>Recent achievements</h3></div></div>{student.latestAchievement ? <Achievement icon="⌁" title={student.latestAchievement} meta={student.achievementMeta || 'Recorded progress update'} color="coral" /> : <p className="section-copy">No achievements have been recorded yet.</p>}</div><div className="panel timeline"><div className="panel-heading"><div><p className="eyebrow">The journey</p><h3>Recorded progress</h3></div></div>{student.growthFlow?.length ? student.growthFlow.map((item) => <div className="timeline-item" key={`${item.title}-${item.time}`}><span className={`timeline-dot ${item.color}`} /><div><strong>{item.title}</strong><p>{item.detail}</p></div><time>{item.time}</time></div>) : <p className="section-copy">No progress milestones have been recorded yet.</p>}</div></section>
        </> : <SectionView active={active} student={student} onGenerateSummary={() => generateSummary(student.email)} canGenerateSummary={canExportProfile} reportRefreshKey={reportRefreshKey} />}
      </div>
    </main>
    {loginNotice && <div className="login-toast" role="status"><CheckCircle2 size={15} /><span><strong>Student Thrive</strong><small>{loginNotice}</small></span><button onClick={() => setLoginNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
    {assessmentOpen && role === 'Student' && <DassAssessment onClose={() => setAssessmentOpen(false)} />}
    {profileOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setProfileOpen(false)}><section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-heading"><div><p className="eyebrow">Student profile</p><h2 id="profile-title">{student.name}</h2><p>{student.reg} · {student.course} · {student.year}</p></div><button className="close-button" onClick={() => setProfileOpen(false)} aria-label="Close profile"><X size={18} /></button></div><div className="profile-details"><div><span>Email</span><strong>{student.email || 'Not provided'}</strong></div><div><span>Department</span><strong>{student.department || 'Not recorded'}</strong></div><div><span>Section</span><strong>{student.section || 'Not recorded'}</strong></div><div><span>Subjects interested in</span><strong>{student.subjects.length ? student.subjects.join(', ') : 'Not recorded'}</strong></div><div><span>Skills to develop</span><strong>{student.interests.length ? student.interests.join(', ') : 'Not recorded'}</strong></div><div className="profile-detail-wide"><span>Student details</span><strong>{student.details || 'No additional details recorded.'}</strong></div></div><button className="primary-button" onClick={() => setProfileOpen(false)}>Close profile</button></section></div>}
    {registrationOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setRegistrationOpen(false)}><section className="registration-modal" role="dialog" aria-modal="true" aria-labelledby="registration-title"><div className="modal-heading"><div><p className="eyebrow">Directory intake</p><h2 id="registration-title">Register a student</h2><p>Add a student profile to start tracking their growth signals.</p></div><button className="close-button" onClick={() => setRegistrationOpen(false)} aria-label="Close registration form"><X size={18} /></button></div><form onSubmit={registerStudent}><div className="form-grid"><label className="wide-field">Full name<input autoFocus value={registration.name} onChange={(event) => setRegistration({ ...registration, name: event.target.value })} placeholder="e.g. Ananya Rao" /></label><label>Registration number<input value={registration.reg} onChange={(event) => setRegistration({ ...registration, reg: event.target.value })} placeholder="STU-2024-0201" /></label><label>Course<input value={registration.course} onChange={(event) => setRegistration({ ...registration, course: event.target.value })} placeholder="e.g. Computer Science" /></label><label>Year (optional)<select value={registration.year} onChange={(event) => setRegistration({ ...registration, year: event.target.value })}><option value="">Not provided</option><option>Year 1</option><option>Year 2</option><option>Year 3</option><option>Year 4</option></select></label><label>Section (optional)<select value={registration.section} onChange={(event) => setRegistration({ ...registration, section: event.target.value })}><option value="">Not provided</option><option>Section A</option><option>Section B</option><option>Section C</option></select></label></div>{registrationError && <p className="form-error"><CircleHelp size={14} /> {registrationError}</p>}<div className="form-note"><CheckCircle2 size={16} /><span><strong>Privacy-first record</strong><small>Academic and well-being signals can be added after registration.</small></span></div><div className="modal-actions"><button type="button" className="outline-button" onClick={() => setRegistrationOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Create profile</button></div></form></section></div>}
    <button className="chat-launcher" onClick={() => setChatOpen((value) => !value)}>{chatOpen ? <X size={20} /> : <MessageCircle size={20} />}<span>Student Thrive AI</span></button>
    {chatOpen && <aside className="chat-panel"><div className="chat-header"><div className="bot-icon"><Bot size={20} /></div><div><strong>Student Thrive AI</strong><small>Profile-grounded support</small></div><button onClick={() => setChatOpen(false)} aria-label="Close assistant"><X size={17} /></button></div><div className="chat-body">{messages.map((item, index) => <div className={index % 2 === 0 ? 'chat-bubble bot' : 'chat-bubble user'} key={`${item}-${index}`}>{item}</div>)}{isAssistantThinking && <div className="chat-bubble bot" role="status">Student Thrive AI is thinking…</div>}</div><div className="quick-prompts"><button onClick={() => setMessage('What is my attendance?')}>Attendance</button><button onClick={() => setMessage('Give me a study plan.')}>Study plan</button></div><div className="chat-input"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Ask about progress or study planning…" /><button onClick={sendMessage} disabled={isAssistantThinking} aria-label="Send message"><Send size={16} /></button></div></aside>}
  </div>
}

function StudentImportPanel({ onImported }: { onImported: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file || isUploading) return
    setIsUploading(true)
    setError('')
    setResult(null)
    try {
      const response = await api.importStudents(file)
      setResult(response)
      setFile(null)
      await onImported()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Import could not be completed.')
    } finally {
      setIsUploading(false)
    }
  }

  return <section className="staff-panel import-panel">
    <div className="panel-title-row"><div><p className="eyebrow">Bulk data intake</p><h2>Import student records</h2></div><span className="panel-badge">CSV · Excel · JSON</span></div>
    <p className="section-copy">Import student profiles and optional progress fields. New accounts receive a one-time activation code; share it with the student through a secure channel.</p>
    <form className="import-form" onSubmit={submit}>
      <label>Student data file<input type="file" accept=".csv,.json,.xlsx,.xlsm" required onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>Maximum 5 MB and 2,000 records. Required columns: name, email, registration_number, course.</small></label>
      <button type="submit" className="primary-button" disabled={!file || isUploading}><Upload size={16} /> {isUploading ? 'Importing records…' : 'Import students'}</button>
    </form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {result && <div className="import-result" role="status"><strong>Import complete</strong><span>{result.created} created · {result.updated} updated · {result.failed} failed</span>{result.activations.length > 0 && <div className="activation-codes"><p>One-time activation codes · expires in 7 days</p>{result.activations.map((item) => <div key={item.email}><span>{item.email}</span><code>{item.code}</code></div>)}</div>}{result.failures.length > 0 && <details><summary>{result.failures.length} record validation error(s)</summary><ul>{result.failures.map((item) => <li key={item.row}>Row {item.row}: {item.errors.join(' ')}</li>)}</ul></details>}</div>}
  </section>
}

function StaffDashboard({ role, studentList, selectedStudent, staffReport, setStaffReport, onSubmit, error, reportExportError, onGenerateSummary, reportRefreshKey, savedMessage, onDismissNotice, onStudentsImported, directoryLoading, directoryError, accountName }: { role: 'Faculty' | 'Advisor'; studentList: Student[]; selectedStudent?: Student; staffReport: { email: string; attendance: string; gpa: string; skills: string; streak: string; subject: string; achievement: string; wellbeing: string; notes: string }; setStaffReport: (value: { email: string; attendance: string; gpa: string; skills: string; streak: string; subject: string; achievement: string; wellbeing: string; notes: string }) => void; onSubmit: (event: FormEvent) => void; error: string; reportExportError: string; onGenerateSummary: () => void; reportRefreshKey: number; savedMessage: string; onDismissNotice: () => void; onStudentsImported: () => Promise<void>; directoryLoading: boolean; directoryError: string; accountName: string }) {
  const attendanceRecords = studentList.flatMap((student) => student.attendance === null ? [] : [student.attendance])
  const gpaRecords = studentList.flatMap((student) => student.gpa === null ? [] : [student.gpa])
  const averageAttendance = attendanceRecords.length ? Math.round(attendanceRecords.reduce((total, value) => total + value, 0) / attendanceRecords.length) : null
  const averageGpa = gpaRecords.length ? (gpaRecords.reduce((total, value) => total + value, 0) / gpaRecords.length).toFixed(1) : null
  const incompleteRecords = studentList.filter((student) => student.attendance === null || student.gpa === null).length
  const needsFollowUp = studentList.filter((student) => student.wellbeing.toLowerCase() === 'needs check-in').length
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [attendanceFilter, setAttendanceFilter] = useState('')
  const [gpaFilter, setGpaFilter] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [page, setPage] = useState(0)
  const isAdvisor = role === 'Advisor'
  const directoryCourses = [...new Set(studentList.map((student) => student.course).filter((value) => value && value !== 'Not provided'))]
  const directoryYears = [...new Set(studentList.map((student) => student.year).filter((value) => value && value !== 'Not provided'))]
  const directorySections = [...new Set(studentList.map((student) => student.section).filter((value) => value && value !== 'Not provided'))]
  const passesRange = (value: number | null, filter: string) => {
    if (!filter) return true
    if (filter === 'missing') return value === null
    if (value === null) return false
    const [minimum, maximum] = filter.split(':').map(Number)
    return value >= minimum && value <= maximum
  }
  const filteredStudents = studentList
    .filter((item) => `${item.name} ${item.reg} ${item.email} ${item.course} ${item.department}`.toLowerCase().includes(directoryQuery.trim().toLowerCase())
      && (!courseFilter || item.course === courseFilter)
      && (!yearFilter || item.year === yearFilter)
      && (!sectionFilter || item.section === sectionFilter)
      && passesRange(item.attendance, attendanceFilter)
      && passesRange(item.gpa, gpaFilter))
    .sort((left, right) => {
      if (sortBy === 'attendance-asc' || sortBy === 'attendance-desc') {
        const difference = (left.attendance ?? Number.POSITIVE_INFINITY) - (right.attendance ?? Number.POSITIVE_INFINITY)
        return sortBy === 'attendance-asc' ? difference : -difference
      }
      if (sortBy === 'gpa-asc' || sortBy === 'gpa-desc') {
        const difference = (left.gpa ?? Number.POSITIVE_INFINITY) - (right.gpa ?? Number.POSITIVE_INFINITY)
        return sortBy === 'gpa-asc' ? difference : -difference
      }
      return left.name.localeCompare(right.name)
    })
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize))
  const pageStudents = filteredStudents.slice(page * pageSize, (page + 1) * pageSize)
  useEffect(() => { setPage(0) }, [directoryQuery, courseFilter, yearFilter, sectionFilter, attendanceFilter, gpaFilter, sortBy])
  const staffNav = isAdvisor
    ? [['Student success', 'student-directory'], ['At-risk records', 'student-directory'], ['Data coverage', 'student-summary'], ['Reports', 'student-reports']]
    : [['Students', 'student-directory'], ['Academic monitoring', 'progress-update'], ['Attendance', 'student-directory'], ['Reports', 'student-reports']]

  return <div className="staff-shell">
    <aside className="staff-sidebar">
      <UniversityBrand compact />
      <div className="staff-sidebar-header">
        <p className="eyebrow">Vignan University</p>
        <h2>{isAdvisor ? 'Student success workspace' : 'Faculty workspace'}</h2>
      </div>
      <nav className="staff-nav">
        {staffNav.map(([label, target], index) => <button key={label} className={index === 0 ? 'nav-item active' : 'nav-item'} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' })}><LayoutDashboard size={18} /><span>{label}</span></button>)}
      </nav>
      <div className="access-note">
        <ShieldCheck size={16} />
        <span><strong>Authorized access</strong><small>Only faculty and advisor roles can update student records.</small></span>
      </div>
    </aside>
    <main className="staff-main">
      <header className="staff-header">
        <div>
          <p className="eyebrow">Welcome, {accountName || 'university staff'}</p>
          <h1>{isAdvisor ? 'Student success dashboard' : 'Academic monitoring'}</h1>
        </div>
        <div className="staff-header-meta">
          <span>Live directory</span>
          <strong>{studentList.length} students</strong>
        </div>
      </header>

      <section className="staff-summary-grid" id="student-summary">
        {isAdvisor ? <>
          <div className="summary-card coral"><span>Explicit check-in flags</span><strong>{needsFollowUp}</strong><small>Recorded “Needs check-in” status</small></div>
          <div className="summary-card teal"><span>Attendance missing</span><strong>{studentList.filter((student) => student.attendance === null).length}</strong><small>No attendance value recorded</small></div>
          <div className="summary-card gold"><span>Academic data missing</span><strong>{studentList.filter((student) => student.gpa === null).length}</strong><small>No GPA value recorded</small></div>
          <div className="summary-card coral"><span>Students in directory</span><strong>{studentList.length}</strong><small>Authorized student profiles</small></div>
        </> : <>
          <div className="summary-card coral"><span>Students</span><strong>{studentList.length}</strong><small>In the authorized directory</small></div>
          <div className="summary-card teal"><span>Average attendance</span><strong>{averageAttendance === null ? 'Not recorded' : `${averageAttendance}%`}</strong><small>{attendanceRecords.length} recorded values</small></div>
          <div className="summary-card gold"><span>Average academic score</span><strong>{averageGpa === null ? 'Not recorded' : `${averageGpa}/10`}</strong><small>{gpaRecords.length} recorded values</small></div>
          <div className="summary-card coral"><span>Records incomplete</span><strong>{incompleteRecords}</strong><small>Missing attendance or academic average</small></div>
        </>}
      </section>

      <StudentImportPanel onImported={onStudentsImported} />

      <section className="staff-grid" id="student-directory">
        <form className="staff-panel" id="progress-update" onSubmit={onSubmit}>
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Data intake</p>
              <h2>Academic & attendance report</h2>
            </div>
            <span className="panel-badge">Verified</span>
          </div>
          <div className="staff-form-grid">
            <label>Select student<select required value={staffReport.email} onChange={(event) => setStaffReport({ ...staffReport, email: event.target.value })}><option value="">Select a student</option>{studentList.map((student) => <option key={student.email} value={student.email}>{student.name} · {student.reg}</option>)}</select></label>
            <label>Attendance %<input type="number" min="0" max="100" required value={staffReport.attendance} onChange={(event) => setStaffReport({ ...staffReport, attendance: event.target.value })} /></label>
            <label>Academic average<input type="number" min="0" max="10" step="0.1" required value={staffReport.gpa} onChange={(event) => setStaffReport({ ...staffReport, gpa: event.target.value })} /></label>
            <label>Skills growth %<input type="number" min="0" max="100" required value={staffReport.skills} onChange={(event) => setStaffReport({ ...staffReport, skills: event.target.value })} /></label>
            <label>Consistency streak<input type="number" min="0" required value={staffReport.streak} onChange={(event) => setStaffReport({ ...staffReport, streak: event.target.value })} /></label>
            <label>Current subject<input value={staffReport.subject} onChange={(event) => setStaffReport({ ...staffReport, subject: event.target.value })} /></label>
            <label>Achievement<input value={staffReport.achievement} onChange={(event) => setStaffReport({ ...staffReport, achievement: event.target.value })} /></label>
            <label>Well-being<input value={staffReport.wellbeing} onChange={(event) => setStaffReport({ ...staffReport, wellbeing: event.target.value })} /></label>
            <label className="wide-input">Operational notes<textarea value={staffReport.notes} onChange={(event) => setStaffReport({ ...staffReport, notes: event.target.value })} /></label>
          </div>
          {error && <p className="form-error"><CircleHelp size={14} /> {error}</p>}
          {reportExportError && <p className="form-error" role="alert">{reportExportError}</p>}
          {savedMessage && <div className="save-success"><CheckCircle2 size={15} /><span>{savedMessage}</span><button type="button" onClick={onDismissNotice}><X size={13} /></button></div>}
          <div className="staff-actions">
            <button type="submit" className="primary-button" disabled={!studentList.length}>Publish verified update</button>
          </div>
        </form>

        <div className="staff-panel">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Student view</p>
              <h2>Current student snapshot</h2>
            </div>
          </div>
          {selectedStudent ? <div className="student-detail-card">
            <div className="student-detail-header">
              <span className="avatar" style={{ background: selectedStudent.accent }}>{selectedStudent.initials}</span>
              <div>
                <strong>{selectedStudent.name}</strong>
                <small>{selectedStudent.reg} · {selectedStudent.course}</small>
              </div>
            </div>
            <div className="mini-metrics">
              <div><span>Attendance</span><strong>{selectedStudent.attendance !== null ? `${selectedStudent.attendance}%` : 'Not recorded'}</strong></div>
              <div><span>GPA</span><strong>{selectedStudent.gpa !== null ? `${selectedStudent.gpa.toFixed(1)}/10` : 'Not recorded'}</strong></div>
              <div><span>Streak</span><strong>{selectedStudent.streak !== null ? `${selectedStudent.streak} w` : 'Not recorded'}</strong></div>
            </div>
            <p>{selectedStudent.progressNotes || 'No notes recorded yet.'}</p>
          </div> : <p className="section-copy">No student selected.</p>}

          <div className="directory-filters">
            <input aria-label="Search students" placeholder="Search name, email or registration…" value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} />
            <select aria-label="Filter by course" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}><option value="">All courses</option>{directoryCourses.map((course) => <option key={course}>{course}</option>)}</select>
            <select aria-label="Filter by year" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="">All years</option>{directoryYears.map((year) => <option key={year}>{year}</option>)}</select>
            <select aria-label="Filter by section" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="">All sections</option>{directorySections.map((section) => <option key={section}>{section}</option>)}</select>
            <select aria-label="Filter by attendance" value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value)}><option value="">Any attendance</option><option value="missing">Not recorded</option><option value="0:59.99">0–59%</option><option value="60:74.99">60–74%</option><option value="75:89.99">75–89%</option><option value="90:100">90–100%</option></select>
            <select aria-label="Filter by GPA" value={gpaFilter} onChange={(event) => setGpaFilter(event.target.value)}><option value="">Any GPA</option><option value="missing">Not recorded</option><option value="0:3.99">0–3.99</option><option value="4:5.99">4–5.99</option><option value="6:7.99">6–7.99</option><option value="8:10">8–10</option></select>
            <select aria-label="Sort students" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="name">Name A–Z</option><option value="attendance-asc">Attendance low–high</option><option value="attendance-desc">Attendance high–low</option><option value="gpa-asc">GPA low–high</option><option value="gpa-desc">GPA high–low</option></select>
          </div>
          {directoryLoading ? <p className="section-copy" role="status">Loading students…</p> : directoryError ? <p className="form-error" role="alert">{directoryError}</p> : studentList.length === 0 ? <p className="section-copy">No student records are available yet. Import a verified student file to begin.</p> : filteredStudents.length === 0 ? <p className="section-copy">No students match these search filters.</p> : <>
            <div className="student-table-wrap"><table className="student-table"><thead><tr><th>Student</th><th>Registration</th><th>Course</th><th>Year</th><th>Section</th><th>Attendance</th><th>GPA</th><th>Skills</th></tr></thead><tbody>{pageStudents.map((item) => <tr key={item.email} className={selectedStudent?.email === item.email ? 'selected-row' : ''}><td><button type="button" className="student-table-link" onClick={() => setStaffReport({ ...staffReport, email: item.email })}>{item.name}</button>{item.isDemo && <span className="demo-tag">Demo</span>}</td><td>{item.reg}</td><td>{item.course}</td><td>{item.year}</td><td>{item.section}</td><td>{item.attendance !== null ? `${item.attendance}%` : '—'}</td><td>{item.gpa !== null ? item.gpa.toFixed(1) : '—'}</td><td>{item.skills !== null ? `${item.skills}%` : '—'}</td></tr>)}</tbody></table></div>
            {pageCount > 1 && <div className="pagination-controls"><span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredStudents.length)} of {filteredStudents.length}</span><button type="button" className="outline-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Previous</button><button type="button" className="outline-button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}>Next</button></div>}
          </>}
        </div>
      </section>
      {selectedStudent && <div id="student-reports"><ReportsView student={selectedStudent} onGenerateSummary={onGenerateSummary} canGenerateSummary refreshKey={reportRefreshKey} /></div>}
    </main>
  </div>
}

function Metric({ label, value, suffix, detail, icon, tone }: { label: string; value: string | number; suffix?: string; detail: string; icon: React.ReactNode; tone: string }) { return <div className={`metric-card ${tone}`}><div className="metric-icon">{icon}</div><span className="metric-label">{label}</span><div className="metric-value">{value}<small>{suffix}</small></div><p>{detail}</p></div> }
function Achievement({ icon, title, meta, color }: { icon: string; title: string; meta: string; color: string }) { return <div className="achievement"><span className={`achievement-icon ${color}`}>{icon}</span><div><strong>{title}</strong><p>{meta}</p></div><span className="achievement-arrow">↗</span></div> }
function InsightCard({ title, detail, evidence, tone }: { title: string; detail: string; evidence: string; tone: string }) { return <article className={`insight-note ${tone}`}><span className="insight-note-icon"><Sparkles size={15} /></span><div><h3>{title}</h3><p>{detail}</p><small><CheckCircle2 size={13} /> Based on: {evidence}</small></div></article> }

createRoot(document.getElementById('root')!).render(<App />)
