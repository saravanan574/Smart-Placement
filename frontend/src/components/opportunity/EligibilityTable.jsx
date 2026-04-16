import React from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

const EligibilityTable = ({ eligibilityResult }) => {
  if (!eligibilityResult) return null

  const {
    cgpaCheck,
    tenthCheck,
    twelfthCheck,
    backlogCheck,
    departmentCheck
  } = eligibilityResult

  const rows = [
    {
      label: 'CGPA',
      check: cgpaCheck,
      formatRequired: (val) => (val !== null && val !== undefined ? `≥ ${val}` : 'No requirement'),
      formatUser: (val) => (val !== null && val !== undefined ? val : 'Not set')
    },
    {
      label: '10th Percentage',
      check: tenthCheck,
      formatRequired: (val) =>
        val !== null && val !== undefined ? `≥ ${val}%` : 'No requirement',
      formatUser: (val) =>
        val !== null && val !== undefined ? `${val}%` : 'Not set'
    },
    {
      label: '12th Percentage',
      check: twelfthCheck,
      formatRequired: (val) =>
        val !== null && val !== undefined ? `≥ ${val}%` : 'No requirement',
      formatUser: (val) =>
        val !== null && val !== undefined ? `${val}%` : 'Not set'
    },
    {
      label: 'Active Backlogs',
      check: backlogCheck,
      formatRequired: (val) =>
        val !== null && val !== undefined ? `≤ ${val}` : 'No requirement',
      formatUser: (val) =>
        val !== null && val !== undefined ? val : 'Not set'
    },
    {
      label: 'Department',
      check: departmentCheck,
      formatRequired: (val) => {
        if (!val || (Array.isArray(val) && val.length === 0)) {
          return 'All branches'
        }
        return Array.isArray(val) ? val.join(', ') : val
      },
      formatUser: (val) =>
        val !== null && val !== undefined ? val : 'Not set'
    }
  ]

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Criteria
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Required
            </th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Your Value
            </th>
            <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            if (!row.check) return null

            const passed = row.check.passed
            const required = row.check.required
            const userValue = row.check.userValue

            return (
              <tr
                key={row.label}
                className={`transition-colors ${
                  passed ? 'hover:bg-green-50' : 'hover:bg-red-50'
                }`}
              >
                <td className="px-3 py-2.5 font-medium text-gray-700">
                  {row.label}
                </td>
                <td className="px-3 py-2.5 text-gray-600">
                  {row.formatRequired(required)}
                </td>
                <td className="px-3 py-2.5 text-gray-600">
                  {row.formatUser(userValue)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {passed ? (
                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Overall result */}
      <div
        className={`px-3 py-2.5 flex items-center gap-2 border-t
                    ${
                      eligibilityResult.isEligible
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
      >
        {eligibilityResult.isEligible ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-700">
              You meet all eligibility criteria
            </span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-red-700">
                Not eligible
              </span>
              {eligibilityResult.failedReasons &&
                eligibilityResult.failedReasons.length > 0 && (
                  <ul className="mt-0.5">
                    {eligibilityResult.failedReasons.map((reason, i) => (
                      <li key={i} className="text-xs text-red-600">
                        • {reason}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default EligibilityTable