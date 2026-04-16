import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, X, Upload, Trash2, Plus, Check, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI } from '../../services/api'
import Header from '../../components/layout/Header'

const DEPARTMENTS = ['CSE', 'IT', 'ECE', 'MECH', 'CIVIL', 'EEE', 'OTHER']
const BATCH_YEARS = ['2025', '2026', '2027', '2028']
const DEGREES = ['B.E', 'B.Tech', 'M.E', 'M.Tech', 'MCA', 'MBA', 'Diploma', 'OTHER']

// Skill suggestions grouped by category
const SKILL_SUGGESTIONS = {
  'Programming': ['Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift'],
  'Web': ['React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'HTML', 'CSS', 'Tailwind CSS', 'Next.js', 'Django', 'Flask', 'Spring Boot'],
  'Database': ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'SQLite', 'Oracle DB'],
  'AI / ML': ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'OpenCV'],
  'Cloud & DevOps': ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Git', 'GitHub Actions'],
  'DSA & CS': ['Data Structures', 'Algorithms', 'System Design', 'OOP', 'DBMS', 'OS', 'Computer Networks'],
  'Mobile': ['Android', 'iOS', 'React Native', 'Flutter'],
  'Tools': ['Git', 'Postman', 'Figma', 'Jira', 'VS Code', 'IntelliJ IDEA']
}

const STEPS = [
  { label: 'Basic Info' },
  { label: 'Academic' },
  { label: 'Skills' },
  { label: 'Custom' }
]

// ─── Step Indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ currentStep }) => (
  <div className="mb-8">
    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
      <div
        className="bg-primary h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
      />
    </div>
    <div className="flex items-center justify-between">
      {STEPS.map((step, index) => {
        const stepNum = index + 1
        const isCompleted = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        return (
          <div key={stepNum} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
              ${isCompleted ? 'bg-primary text-white' : isCurrent ? 'border-2 border-primary text-primary bg-white' : 'bg-gray-200 text-gray-400'}`}>
              {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-gray-400'}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  </div>
)

// ─── Step 1: Basic Info ──────────────────────────────────────────────────────
const Step1 = ({ formData, errors, handleChange, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, inputClass }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
      <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="John Doe" className={inputClass('name')} />
      {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Register Number <span className="text-red-500">*</span></label>
      <input name="registerNumber" type="text" value={formData.registerNumber} onChange={handleChange} placeholder="e.g. 21CS001" className={inputClass('registerNumber')} />
      {errors.registerNumber
        ? <p className="mt-1 text-xs text-red-500">{errors.registerNumber}</p>
        : <p className="mt-1 text-xs text-gray-400">This cannot be changed after registration</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Placement Email <span className="text-red-500">*</span></label>
      <input name="loginEmail" type="email" value={formData.loginEmail} onChange={handleChange} placeholder="your@college.edu" className={inputClass('loginEmail')} />
      {errors.loginEmail && <p className="mt-1 text-xs text-red-500">{errors.loginEmail}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal Email <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
      <input name="personalEmail" type="email" value={formData.personalEmail} onChange={handleChange} placeholder="personal@gmail.com" className={inputClass('personalEmail')} />
      {errors.personalEmail && <p className="mt-1 text-xs text-red-500">{errors.personalEmail}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Phone Number <span className="text-gray-400 text-xs font-normal">(for notifications)</span>
      </label>
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange}
          placeholder="+91 98765 43210" className={`${inputClass('phoneNumber')} pl-9`} />
      </div>
      {errors.phoneNumber && <p className="mt-1 text-xs text-red-500">{errors.phoneNumber}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
      <div className="relative">
        <input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange}
          placeholder="Min. 8 characters" className={`${inputClass('password')} pr-12`} />
        <button type="button" onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
      <div className="relative">
        <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword}
          onChange={handleChange} placeholder="Re-enter password" className={`${inputClass('confirmPassword')} pr-12`} />
        <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
    </div>
  </div>
)

// ─── Step 2: Academic Details ─────────────────────────────────────────────────
const Step2 = ({ formData, errors, handleChange, inputClass }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Degree <span className="text-red-500">*</span></label>
        <select name="degree" value={formData.degree} onChange={handleChange} className={inputClass('degree')}>
          <option value="">Select Degree</option>
          {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {errors.degree && <p className="mt-1 text-xs text-red-500">{errors.degree}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department <span className="text-red-500">*</span></label>
        <select name="department" value={formData.department} onChange={handleChange} className={inputClass('department')}>
          <option value="">Select</option>
          {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
        </select>
        {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Batch Year <span className="text-red-500">*</span></label>
      <select name="batchYear" value={formData.batchYear} onChange={handleChange} className={inputClass('batchYear')}>
        <option value="">Select</option>
        {BATCH_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      {errors.batchYear && <p className="mt-1 text-xs text-red-500">{errors.batchYear}</p>}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">10th Percentage</label>
        <input name="tenthPercentage" type="number" min="0" max="100" step="0.01"
          value={formData.tenthPercentage} onChange={handleChange} placeholder="e.g. 85.5" className={inputClass('tenthPercentage')} />
        {errors.tenthPercentage && <p className="mt-1 text-xs text-red-500">{errors.tenthPercentage}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">12th Percentage</label>
        <input name="twelfthPercentage" type="number" min="0" max="100" step="0.01"
          value={formData.twelfthPercentage} onChange={handleChange} placeholder="e.g. 90.0" className={inputClass('twelfthPercentage')} />
        {errors.twelfthPercentage && <p className="mt-1 text-xs text-red-500">{errors.twelfthPercentage}</p>}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Current CGPA</label>
      <input name="currentCGPA" type="number" min="0" max="10" step="0.01"
        value={formData.currentCGPA} onChange={handleChange} placeholder="e.g. 8.5 (out of 10)" className={inputClass('currentCGPA')} />
      {errors.currentCGPA && <p className="mt-1 text-xs text-red-500">{errors.currentCGPA}</p>}
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Active Backlogs</label>
        <input name="activeBacklogs" type="number" min="0" value={formData.activeBacklogs} onChange={handleChange} placeholder="0" className={inputClass('activeBacklogs')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">History of Arrears</label>
        <input name="historyOfArrears" type="number" min="0" value={formData.historyOfArrears} onChange={handleChange} placeholder="0" className={inputClass('historyOfArrears')} />
      </div>
    </div>
  </div>
)

// ─── Step 3: Skills & Resume ──────────────────────────────────────────────────
const Step3 = ({ formData, handleResumeSelect, removeResume, resumeInputRef, toggleSkill }) => {
  const [activeCategory, setActiveCategory] = useState('Programming')

  return (
    <div className="space-y-6">
      {/* Selected skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Your Skills
          <span className="ml-2 text-xs text-gray-400 font-normal">Click skills below to add/remove</span>
        </label>

        {formData.skills.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl min-h-[48px]">
            {formData.skills.map((skill) => (
              <span key={skill}
                onClick={() => toggleSkill(skill)}
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white rounded-full px-3 py-1 text-xs font-medium cursor-pointer hover:bg-red-500 transition-colors group">
                {skill}
                <X className="w-3 h-3 opacity-70 group-hover:opacity-100" />
              </span>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
            No skills selected yet — click from suggestions below
          </div>
        )}
      </div>

      {/* Skill suggestions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Browse by Category</label>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.keys(SKILL_SUGGESTIONS).map((cat) => (
            <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Skills for active category */}
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {SKILL_SUGGESTIONS[activeCategory].map((skill) => {
            const isAdded = formData.skills.includes(skill)
            return (
              <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isAdded
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'}`}>
                {isAdded && <Check className="w-3 h-3" />}
                {skill}
              </button>
            )
          })}
        </div>
      </div>

      {/* Resume upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Resume <span className="text-gray-400 text-xs font-normal">(PDF only, max 5MB)</span>
        </label>

        {formData.resumeFile ? (
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <Upload className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{formData.resumeFile.name}</p>
                <p className="text-xs text-gray-500">{(formData.resumeFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button type="button" onClick={removeResume} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div onClick={() => resumeInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-blue-50 transition-all duration-150">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 font-medium">Drag PDF here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">PDF files only, max 5MB</p>
          </div>
        )}
        <input ref={resumeInputRef} type="file" accept=".pdf" className="hidden" onChange={handleResumeSelect} />
      </div>
    </div>
  )
}

// ─── Step 4: Custom Details ───────────────────────────────────────────────────
const Step4 = ({ formData, handleCustomDetailChange, addCustomRow, removeCustomRow }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Custom Identification Details</label>
      <p className="text-xs text-gray-400 mb-4">
        Add details that help identify you in shortlist emails (e.g. Placement ID, Hostel Block, LinkedIn URL, Roll Number)
      </p>
    </div>

    <div className="space-y-3">
      {formData.customDetails.map((detail, index) => (
        <div key={index} className="flex items-center gap-2">
          <input type="text" value={detail.key} onChange={(e) => handleCustomDetailChange(index, 'key', e.target.value)}
            placeholder="Key (e.g. Placement ID)"
            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white placeholder-gray-400" />
          <input type="text" value={detail.value} onChange={(e) => handleCustomDetailChange(index, 'value', e.target.value)}
            placeholder="Value (e.g. CS2021001)"
            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white placeholder-gray-400" />
          <button type="button" onClick={() => removeCustomRow(index)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>

    <button type="button" onClick={addCustomRow} className="flex items-center gap-2 text-sm text-primary hover:text-accent transition-colors font-medium">
      <Plus className="w-4 h-4" /> Add More
    </button>

    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <p className="text-xs text-blue-700 font-medium mb-1">💡 Why is this important?</p>
      <p className="text-xs text-blue-600">
        SPEI uses these details to scan shortlist announcement emails and automatically detect if you're selected. Add your placement portal ID, roll number, or any unique identifier used by your college.
      </p>
    </div>
  </div>
)

// ─── Main Register Component ──────────────────────────────────────────────────
const Register = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const resumeInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    registerNumber: '',
    loginEmail: '',
    personalEmail: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    degree: '',
    department: '',
    batchYear: '',
    tenthPercentage: '',
    twelfthPercentage: '',
    currentCGPA: '',
    activeBacklogs: '0',
    historyOfArrears: '0',
    skills: [],
    resumeFile: null,
    customDetails: [{ key: '', value: '' }, { key: '', value: '' }]
  })

  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill)
      return {
        ...prev,
        skills: exists ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill]
      }
    })
  }

  const handleResumeSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Resume must be under 5MB'); return }
    setFormData((prev) => ({ ...prev, resumeFile: file }))
  }

  const removeResume = () => {
    setFormData((prev) => ({ ...prev, resumeFile: null }))
    if (resumeInputRef.current) resumeInputRef.current.value = ''
  }

  const handleCustomDetailChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.customDetails]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, customDetails: updated }
    })
  }

  const addCustomRow = () => {
    setFormData((prev) => ({ ...prev, customDetails: [...prev.customDetails, { key: '', value: '' }] }))
  }

  const removeCustomRow = (index) => {
    setFormData((prev) => ({ ...prev, customDetails: prev.customDetails.filter((_, i) => i !== index) }))
  }

  const inputClass = (field) =>
    `w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent
     focus:border-transparent transition-all duration-150 bg-white text-gray-900 placeholder-gray-400
     ${errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'}`

  const validateStep = (step) => {
    const newErrors = {}
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Full name is required'
      if (!formData.registerNumber.trim()) newErrors.registerNumber = 'Register number is required'
      if (!formData.loginEmail.trim()) {
        newErrors.loginEmail = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.loginEmail)) {
        newErrors.loginEmail = 'Enter a valid email'
      }
      if (formData.personalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail)) {
        newErrors.personalEmail = 'Enter a valid email'
      }
      if (formData.phoneNumber && !/^[+\d\s\-()]{7,15}$/.test(formData.phoneNumber)) {
        newErrors.phoneNumber = 'Enter a valid phone number'
      }
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }
    if (step === 2) {
      if (!formData.degree) newErrors.degree = 'Degree is required'
      if (!formData.department) newErrors.department = 'Department is required'
      if (!formData.batchYear) newErrors.batchYear = 'Batch year is required'
      if (formData.tenthPercentage) {
        const val = Number(formData.tenthPercentage)
        if (isNaN(val) || val < 0 || val > 100) newErrors.tenthPercentage = 'Enter a value between 0 and 100'
      }
      if (formData.twelfthPercentage) {
        const val = Number(formData.twelfthPercentage)
        if (isNaN(val) || val < 0 || val > 100) newErrors.twelfthPercentage = 'Enter a value between 0 and 100'
      }
      if (formData.currentCGPA) {
        const val = Number(formData.currentCGPA)
        if (isNaN(val) || val < 0 || val > 10) newErrors.currentCGPA = 'Enter a value between 0 and 10'
      }
    }
    return newErrors
  }

  const handleNext = () => {
    const stepErrors = validateStep(currentStep)
    if (Object.keys(stepErrors).length > 0) { setErrors(stepErrors); return }
    setErrors({})
    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setErrors({})
    setCurrentStep((prev) => prev - 1)
  }

  const handleRegister = async () => {
    setIsLoading(true)
    try {
      const cleanedCustomDetails = formData.customDetails.filter((cd) => cd.key.trim() && cd.value.trim())
      const payload = {
        name: formData.name.trim(),
        registerNumber: formData.registerNumber.trim(),
        loginEmail: formData.loginEmail.trim().toLowerCase(),
        personalEmail: formData.personalEmail.trim().toLowerCase() || null,
        phoneNumber: formData.phoneNumber.trim() || null,
        password: formData.password,
        degree: formData.degree || null,
        department: formData.department,
        batchYear: formData.batchYear,
        tenthPercentage: formData.tenthPercentage ? Number(formData.tenthPercentage) : undefined,
        twelfthPercentage: formData.twelfthPercentage ? Number(formData.twelfthPercentage) : undefined,
        currentCGPA: formData.currentCGPA ? Number(formData.currentCGPA) : undefined,
        activeBacklogs: Number(formData.activeBacklogs) || 0,
        historyOfArrears: Number(formData.historyOfArrears) || 0,
        skills: formData.skills,
        customDetails: cleanedCustomDetails
      }

      const response = await authAPI.register(payload)
      const { token, user } = response.data.data
      localStorage.setItem('spei_token', token)
      localStorage.setItem('spei_user', JSON.stringify(user))

      if (formData.resumeFile) {
        try {
          const resumeForm = new FormData()
          resumeForm.append('resume', formData.resumeFile)
          await authAPI.uploadResume(resumeForm)
        } catch {
          toast.error('Account created but resume upload failed. Upload from Profile.')
        }
      }

      toast.success('Account created successfully! Welcome to SPEI 🎉')
      navigate('/connect-gmail')
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <Header />
      <div className="w-full max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Create Account</h1>
            <p className="text-gray-500 text-sm mt-1">
              Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].label}
            </p>
          </div>

          <StepIndicator currentStep={currentStep} />

          {currentStep === 1 && (
            <Step1 formData={formData} errors={errors} handleChange={handleChange}
              showPassword={showPassword} setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword} setShowConfirmPassword={setShowConfirmPassword}
              inputClass={inputClass} />
          )}
          {currentStep === 2 && (
            <Step2 formData={formData} errors={errors} handleChange={handleChange} inputClass={inputClass} />
          )}
          {currentStep === 3 && (
            <Step3 formData={formData} toggleSkill={toggleSkill}
              handleResumeSelect={handleResumeSelect} removeResume={removeResume}
              resumeInputRef={resumeInputRef} />
          )}
          {currentStep === 4 && (
            <Step4 formData={formData} handleCustomDetailChange={handleCustomDetailChange}
              addCustomRow={addCustomRow} removeCustomRow={removeCustomRow} />
          )}

          <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
            {currentStep > 1 ? (
              <button type="button" onClick={handleBack} disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
                Back
              </button>
            ) : (
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary transition-colors">
                Already have an account?
              </Link>
            )}

            {currentStep < STEPS.length ? (
              <button type="button" onClick={handleNext} disabled={isLoading}
                className="px-6 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-accent transition-colors disabled:opacity-50">
                Next →
              </button>
            ) : (
              <button type="button" onClick={handleRegister} disabled={isLoading}
                className="px-6 py-2.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2">
                {isLoading ? (
                  <React.Fragment>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </React.Fragment>
                ) : 'Create Account 🎉'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register