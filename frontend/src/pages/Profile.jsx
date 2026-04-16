import React, { useState, useEffect, useRef } from 'react'
import {
  Lock, Pencil, Save, X, Plus, Trash2, Upload, ExternalLink,
  Mail, User, BookOpen, Briefcase, Tag, Settings, Loader2,
  Phone, RefreshCw, Check, Sparkles, Target
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI, opportunityAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import ProgressBar from '../components/ui/ProgressBar'
import TagInput from '../components/ui/TagInput'

const SectionCard = ({ icon: Icon, title, subtitle, children, action }) => (
  <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-4">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </div>
)

const Profile = () => {
  const { user, updateProfile, refreshUser, setUser } = useAuth()
  const resumeInputRef = useRef(null)

  // ── Academic edit ──────────────────────────────────────────────────────────
  const [isEditingAcademic, setIsEditingAcademic] = useState(false)
  const [academicForm, setAcademicForm] = useState({
    currentCGPA: '', activeBacklogs: '', historyOfArrears: '',
    tenthPercentage: '', twelfthPercentage: '',
    department: '', batchYear: '', degree: '',
    specialization: '', phoneNumber: ''
  })
  const [isSavingAcademic, setIsSavingAcademic] = useState(false)

  // ── Skills (manual free-type) ──────────────────────────────────────────────
  const [skills, setSkills]               = useState([])
  const [skillsChanged, setSkillsChanged] = useState(false)
  const [isSavingSkills, setIsSavingSkills] = useState(false)

  // ── Resume skills (auto-extracted, editable) ───────────────────────────────
  const [resumeSkills, setResumeSkills]               = useState([])
  const [resumeSkillsChanged, setResumeSkillsChanged] = useState(false)
  const [isSavingResumeSkills, setIsSavingResumeSkills] = useState(false)

  // ── Interested roles (free-type) ───────────────────────────────────────────
  const [interestedRoles, setInterestedRoles]               = useState([])
  const [rolesChanged, setRolesChanged]                     = useState(false)
  const [isSavingRoles, setIsSavingRoles]                   = useState(false)

  // ── Resume upload ──────────────────────────────────────────────────────────
  const [isUploadingResume, setIsUploadingResume] = useState(false)

  // ── Custom details ─────────────────────────────────────────────────────────
  const [customDetails, setCustomDetails] = useState([])
  const [customChanged, setCustomChanged] = useState(false)
  const [isSavingCustom, setIsSavingCustom] = useState(false)

  // ── Rematch ────────────────────────────────────────────────────────────────
  const [isRematching, setIsRematching] = useState(false)

  // ── Populate from user ─────────────────────────────────────────────────────
  useEffect(() => {
    if (user) {
      setAcademicForm({
        currentCGPA:       user.currentCGPA       ?? '',
        activeBacklogs:    user.activeBacklogs     ?? '0',
        historyOfArrears:  user.historyOfArrears   ?? '0',
        tenthPercentage:   user.tenthPercentage    ?? '',
        twelfthPercentage: user.twelfthPercentage  ?? '',
        department:        user.department         ?? '',
        batchYear:         user.batchYear          ?? '',
        degree:            user.degree             ?? '',
        specialization:    user.specialization     ?? '',
        phoneNumber:       user.phoneNumber        ?? ''
      })
      setSkills(user.skills || [])
      setResumeSkills(user.resumeSkills || [])
      setInterestedRoles(user.interestedRoles || [])
      setCustomDetails(
        user.customDetails?.length > 0
          ? user.customDetails
          : [{ key: '', value: '' }]
      )
    }
  }, [user])

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // ── Rematch all opportunities ──────────────────────────────────────────────
  const triggerRematch = async () => {
    setIsRematching(true)
    try {
      await opportunityAPI.rematchAll()
      toast.success('Match scores recalculated for all opportunities!')
    } catch {
      toast.error('Rematch failed. Try again.')
    } finally {
      setIsRematching(false)
    }
  }

  // ── Save academic ──────────────────────────────────────────────────────────
  const handleAcademicSave = async () => {
    setIsSavingAcademic(true)
    try {
      const result = await updateProfile({
        currentCGPA:       academicForm.currentCGPA       !== '' ? Number(academicForm.currentCGPA)       : undefined,
        activeBacklogs:    academicForm.activeBacklogs     !== '' ? Number(academicForm.activeBacklogs)    : undefined,
        historyOfArrears:  academicForm.historyOfArrears   !== '' ? Number(academicForm.historyOfArrears)  : undefined,
        tenthPercentage:   academicForm.tenthPercentage    !== '' ? Number(academicForm.tenthPercentage)   : undefined,
        twelfthPercentage: academicForm.twelfthPercentage  !== '' ? Number(academicForm.twelfthPercentage) : undefined,
        department:        academicForm.department         || undefined,
        batchYear:         academicForm.batchYear          || undefined,
        degree:            academicForm.degree             || undefined,
        specialization:    academicForm.specialization     || null,
        phoneNumber:       academicForm.phoneNumber        || null
      })
      if (result.success) {
        toast.success('Academic details updated!')
        setIsEditingAcademic(false)
      }
    } catch {
      toast.error('Failed to update details')
    } finally {
      setIsSavingAcademic(false)
    }
  }

  // ── Save manual skills ─────────────────────────────────────────────────────
  const handleSaveSkills = async () => {
    setIsSavingSkills(true)
    try {
      const result = await updateProfile({ skills })
      if (result.success) {
        toast.success('Skills saved!')
        setSkillsChanged(false)
        await triggerRematch()
      }
    } catch {
      toast.error('Failed to save skills')
    } finally {
      setIsSavingSkills(false)
    }
  }

  // ── Save resume skills ─────────────────────────────────────────────────────
  const handleSaveResumeSkills = async () => {
    setIsSavingResumeSkills(true)
    try {
      const result = await updateProfile({ resumeSkills })
      if (result.success) {
        toast.success('Resume skills updated!')
        setResumeSkillsChanged(false)
        await triggerRematch()
      }
    } catch {
      toast.error('Failed to save resume skills')
    } finally {
      setIsSavingResumeSkills(false)
    }
  }

  // ── Save interested roles ──────────────────────────────────────────────────
  const handleSaveRoles = async () => {
    setIsSavingRoles(true)
    try {
      const result = await updateProfile({ interestedRoles })
      if (result.success) {
        toast.success('Interested roles saved!')
        setRolesChanged(false)
        await triggerRematch()
      }
    } catch {
      toast.error('Failed to save roles')
    } finally {
      setIsSavingRoles(false)
    }
  }

  // ── Resume upload ──────────────────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Resume must be under 5MB'); return }
    setIsUploadingResume(true)
    try {
      const formData = new FormData()
      formData.append('resume', file)
      const response = await authAPI.uploadResume(formData)
      const updatedUser = response.data.data.user
      setUser(updatedUser)
      // Populate resumeSkills from extraction result
      if (updatedUser.resumeSkills?.length > 0) {
        setResumeSkills(updatedUser.resumeSkills)
        toast.success(`Resume uploaded! ${updatedUser.resumeSkills.length} skills extracted.`)
      } else {
        toast.success('Resume uploaded! Text extracted for skill matching.')
      }
      await triggerRematch()
    } catch {
      toast.error('Failed to upload resume')
    } finally {
      setIsUploadingResume(false)
      if (resumeInputRef.current) resumeInputRef.current.value = ''
    }
  }

  // ── Custom details ─────────────────────────────────────────────────────────
  const handleCustomChange = (index, field, value) => {
    setCustomDetails((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
    setCustomChanged(true)
  }

  const handleSaveCustom = async () => {
    setIsSavingCustom(true)
    try {
      const cleaned = customDetails.filter((cd) => cd.key.trim() && cd.value.trim())
      const result = await updateProfile({ customDetails: cleaned })
      if (result.success) {
        toast.success('Custom details saved!')
        setCustomChanged(false)
      }
    } catch {
      toast.error('Failed to save custom details')
    } finally {
      setIsSavingCustom(false)
    }
  }

  // ── Gmail ──────────────────────────────────────────────────────────────────
  const handleConnectGmail = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl()
      window.location.href = response.data.data.url
    } catch {
      toast.error('Failed to get Google auth URL')
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const resumeBaseUrl = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'http://localhost:5000'

  return (
    <div className="w-full max-w-3xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your academic details, skills, and resume</p>
      </div>

      {/* Profile Completion */}
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Profile Completion</span>
          <span className="text-sm font-bold text-indigo-600">{user.profileCompletion ?? 0}%</span>
        </div>
        <ProgressBar value={user.profileCompletion ?? 0} max={100} height="h-3" colorOverride="bg-indigo-600" />
        {(user.profileCompletion ?? 0) < 100 && (
          <p className="text-xs text-gray-400 mt-2">
            💡 Complete your profile for better job matching and shortlist detection
          </p>
        )}
      </div>

      {/* Basic Info */}
      <SectionCard icon={User} title="Basic Information">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {getInitials(user.name)}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Full Name</p>
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5 flex items-center gap-1">
                Register Number <Lock className="w-3 h-3 text-gray-300" />
              </p>
              <p className="text-sm font-semibold text-gray-900">{user.registerNumber}</p>
              <p className="text-xs text-gray-300 mt-0.5">Cannot be changed</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Degree</p>
              <p className="text-sm text-gray-900">{user.degree || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Department</p>
              <p className="text-sm text-gray-900">{user.department || '—'}</p>
            </div>
            {user.specialization && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Specialization</p>
                <p className="text-sm text-gray-900">{user.specialization}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Batch Year</p>
              <p className="text-sm text-gray-900">{user.batchYear || '—'}</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard icon={Mail} title="Contact"
        subtitle="Update email and WhatsApp in Settings"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Placement Email (Login)</p>
            <p className="text-sm text-gray-900 font-medium">{user.loginEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Personal Email</p>
            <p className="text-sm text-gray-900">{user.personalEmail || <span className="text-gray-400 italic">Not set — add in Settings</span>}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" /> Phone
            </p>
            <p className="text-sm text-gray-900">{user.phoneNumber || <span className="text-gray-400 italic">Not set</span>}</p>
          </div>
          {user.whatsappNumber && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">WhatsApp</p>
              <p className="text-sm text-gray-900">{user.whatsappNumber}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Academic Details */}
      <SectionCard
        icon={BookOpen}
        title="Academic Details"
        action={
          !isEditingAcademic ? (
            <button onClick={() => setIsEditingAcademic(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditingAcademic(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={handleAcademicSave} disabled={isSavingAcademic}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {isSavingAcademic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>
          )
        }
      >
        {!isEditingAcademic ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Degree',             value: user.degree            ?? '—' },
              { label: 'Department',         value: user.department        ?? '—' },
              { label: 'Specialization',     value: user.specialization    ?? '—' },
              { label: 'Current CGPA',       value: user.currentCGPA       ?? '—', suffix: '/ 10' },
              { label: '10th Percentage',    value: user.tenthPercentage   ?? '—', suffix: '%' },
              { label: '12th Percentage',    value: user.twelfthPercentage ?? '—', suffix: '%' },
              { label: 'Active Backlogs',    value: user.activeBacklogs    ?? 0 },
              { label: 'History of Arrears', value: user.historyOfArrears  ?? 0 },
              { label: 'Phone Number',       value: user.phoneNumber       ?? '—' }
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {item.value}
                  {item.suffix && item.value !== '—' && (
                    <span className="text-gray-400 font-normal text-xs ml-0.5">{item.suffix}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* FREE-TYPE fields — no dropdowns */}
            {[
              { key: 'degree',         label: 'Degree',         placeholder: 'e.g. B.E, B.Tech, M.Tech, MBA' },
              { key: 'department',     label: 'Department',     placeholder: 'e.g. CSE, ECE, MECH, Civil'    },
              { key: 'specialization', label: 'Specialization', placeholder: 'e.g. VLSI Design, Data Science' },
              { key: 'batchYear',      label: 'Batch Year',     placeholder: 'e.g. 2025'                     },
              { key: 'phoneNumber',    label: 'Phone Number',   placeholder: '+91 98765 43210'               }
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-500 font-medium mb-1">{field.label}</label>
                <input
                  type="text"
                  value={academicForm[field.key]}
                  onChange={(e) => setAcademicForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            ))}

            {/* Numeric fields */}
            {[
              { key: 'currentCGPA',       label: 'CGPA',               min: 0, max: 10,  step: 0.01, placeholder: '0 – 10'  },
              { key: 'tenthPercentage',   label: '10th %',             min: 0, max: 100, step: 0.01, placeholder: '0 – 100' },
              { key: 'twelfthPercentage', label: '12th %',             min: 0, max: 100, step: 0.01, placeholder: '0 – 100' },
              { key: 'activeBacklogs',    label: 'Active Backlogs',    min: 0, placeholder: '0' },
              { key: 'historyOfArrears',  label: 'History of Arrears', min: 0, placeholder: '0' }
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-gray-500 font-medium mb-1">{field.label}</label>
                <input
                  type="number"
                  min={field.min} max={field.max} step={field.step}
                  value={academicForm[field.key]}
                  onChange={(e) => setAcademicForm((p) => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Manual Skills — free-type TagInput */}
      <SectionCard
        icon={Tag}
        title="Your Skills"
        subtitle="Type a skill and press Enter to add. These are used for job matching."
      >
        <TagInput
          tags={skills}
          onChange={(updated) => { setSkills(updated); setSkillsChanged(true) }}
          placeholder="e.g. Python, React, AutoCAD, VLSI..."
          colorScheme="indigo"
        />

        <div className="flex items-center justify-between mt-3">
          {skillsChanged ? (
            <button onClick={handleSaveSkills} disabled={isSavingSkills}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {isSavingSkills ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save & Rematch
            </button>
          ) : (
            <button onClick={triggerRematch} disabled={isRematching}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {isRematching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Recalculate Match Scores
            </button>
          )}
          {skills.length > 0 && (
            <span className="text-xs text-gray-400">{skills.length} skill{skills.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </SectionCard>

      {/* Resume Skills — auto-extracted, editable */}
      <SectionCard
        icon={Sparkles}
        title="Resume Skills"
        subtitle="Auto-extracted from your resume. Edit, add, or remove as needed."
      >
        {resumeSkills.length === 0 && !user.resumeUrl ? (
          <p className="text-sm text-gray-400 italic">Upload your resume below to auto-extract skills.</p>
        ) : (
          <>
            <TagInput
              tags={resumeSkills}
              onChange={(updated) => { setResumeSkills(updated); setResumeSkillsChanged(true) }}
              placeholder="Skills extracted from resume..."
              colorScheme="green"
            />
            <div className="flex items-center justify-between mt-3">
              {resumeSkillsChanged ? (
                <button onClick={handleSaveResumeSkills} disabled={isSavingResumeSkills}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
                  {isSavingResumeSkills ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              ) : (
                <p className="text-xs text-gray-400">
                  These are merged with your manual skills during job matching.
                </p>
              )}
              {resumeSkills.length > 0 && (
                <span className="text-xs text-gray-400">{resumeSkills.length} extracted</span>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {/* Interested Roles — free-type TagInput */}
      <SectionCard
        icon={Target}
        title="Interested Roles"
        subtitle="Add job roles you're targeting. Gives a +10 boost when a job role matches."
      >
        <TagInput
          tags={interestedRoles}
          onChange={(updated) => { setInterestedRoles(updated); setRolesChanged(true) }}
          placeholder="e.g. SDE, Data Analyst, VLSI Engineer, Site Engineer..."
          colorScheme="violet"
        />
        {rolesChanged && (
          <div className="mt-3">
            <button onClick={handleSaveRoles} disabled={isSavingRoles}
              className="flex items-center gap-1.5 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
              {isSavingRoles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Roles & Rematch
            </button>
          </div>
        )}
      </SectionCard>

      {/* Resume Upload */}
      <SectionCard icon={Briefcase} title="Resume">
        {user.resumeUrl ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Resume uploaded</p>
                <p className="text-xs text-gray-500">{user.resumeUrl.split('/').pop()}</p>
                {user.resumeText && (
                  <p className="text-xs text-green-600 mt-0.5">✓ Text extracted · {resumeSkills.length} skills detected</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={resumeBaseUrl + user.resumeUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> View
              </a>
              <button onClick={() => resumeInputRef.current?.click()} disabled={isUploadingResume}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
                {isUploadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Update
              </button>
            </div>
          </div>
        ) : (
          <div onClick={() => resumeInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
            {isUploadingResume ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm text-gray-500">Uploading & extracting skills...</p>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Upload your resume</p>
                <p className="text-xs text-gray-400 mt-1">PDF or DOCX · Max 5MB · Skills auto-extracted on upload</p>
              </>
            )}
          </div>
        )}
        <input ref={resumeInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
      </SectionCard>

      {/* Gmail Connection */}
      <SectionCard icon={Mail} title="Gmail Connection">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${user.googleAccount?.isConnected ? 'bg-green-500' : 'bg-red-400'}`} />
            {user.googleAccount?.isConnected ? (
              <div>
                <p className="text-sm font-medium text-gray-900">Connected</p>
                <p className="text-xs text-gray-500">{user.googleAccount.email}</p>
                {user.googleAccount.lastSyncedAt && (
                  <p className="text-xs text-gray-400">Last synced: {new Date(user.googleAccount.lastSyncedAt).toLocaleString()}</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">Not Connected</p>
                <p className="text-xs text-gray-500">Connect Gmail to sync placement emails automatically</p>
              </div>
            )}
          </div>
          {user.googleAccount?.isConnected ? (
            <a href="/settings"
              className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              <Settings className="w-3.5 h-3.5" /> Manage in Settings
            </a>
          ) : (
            <button onClick={handleConnectGmail}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Mail className="w-3.5 h-3.5" /> Connect Gmail
            </button>
          )}
        </div>
      </SectionCard>

      {/* Custom Identification Details */}
      <SectionCard icon={Settings} title="Custom Identification Details"
        subtitle="Help SPEI find you in shortlist emails (e.g. Placement ID, College Roll Number)"
      >
        <div className="space-y-2 mb-3">
          {customDetails.map((detail, index) => (
            <div key={index} className="flex items-center gap-2">
              <input type="text" value={detail.key}
                onChange={(e) => handleCustomChange(index, 'key', e.target.value)}
                placeholder="Key (e.g. Placement ID)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-gray-400" />
              <input type="text" value={detail.value}
                onChange={(e) => handleCustomChange(index, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder-gray-400" />
              <button onClick={() => { setCustomDetails((p) => p.filter((_, i) => i !== index)); setCustomChanged(true) }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setCustomDetails((p) => [...p, { key: '', value: '' }])}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Row
          </button>
          {customChanged && (
            <button onClick={handleSaveCustom} disabled={isSavingCustom}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {isSavingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

export default Profile