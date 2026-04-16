import os
import json
import re
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv('GROQ_API_KEY'))
GROQ_MODEL = os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')

# ---------------------------------------------------------------------------
# SPAM KEYWORDS — if ANY of these appear, immediately return not-placement
# ---------------------------------------------------------------------------
SPAM_KEYWORDS = [
    'newsletter', 'nptel', 'coursera', 'udemy', 'swayam',
    'hackathon registration', 'webinar invite', 'seminar invite',
    'club event', 'arduino day', 'workshop registration',
    'fee payment', 'exam schedule', 'holi celebration', 'christmas',
    'otp', 'verify your email', 'subscription', 'unsubscribe',
    'quality week', 'best outgoing student',
    'bootcamp', 'study abroad', 'continuing education',
    'admissions talk', 'summer programme', 'exchange programme',
    'consul general', 'cultural event', 'tech fest', 'symposium',
    'guest lecture', 'guest speaker', 'invited to attend',
    'awareness session', 'career talk', 'career insights',
    'college festival', 'annual day', 'convocation',
    'scholarship programme', 'fellowship programme',
    'university programme', 'academic programme',
    'attendance shortage', 'internal marks', 'exam timetable',
    'fee due', 'hostel fee', 'mess fee',
]

# ---------------------------------------------------------------------------
# STRONG PLACEMENT KEYWORDS — high confidence, only appear in placement emails
# Use full phrases, not single words
# ---------------------------------------------------------------------------
STRONG_PLACEMENT_KEYWORDS = [
    # Job posting
    'campus recruitment drive', 'placement drive', 'hiring drive',
    'eligible branches', 'eligible departments', 'eligible students',
    'ctc of', 'ctc:', 'cost to company', 'annual ctc',
    'stipend of', 'monthly stipend', 'stipend:',
    'last date to apply', 'last date to register for',
    'apply before', 'registration closes on', 'applications close',
    'walk-in interview', 'walk-in drive',
    'on campus drive', 'off campus drive', 'pool campus',
    'full time opportunity', 'full-time role', 'full time role',
    'job opening', 'job opportunity', 'career opportunity at',
    'we are hiring', 'currently hiring', 'actively hiring',
    'joining bonus', 'bond of', 'service agreement',
    # Shortlist
    'shortlisted candidates', 'shortlisted students',
    'selected candidates', 'selected students',
    'following students are selected', 'following candidates',
    'list of shortlisted', 'list of selected',
    'you have been shortlisted', 'you have been selected',
    'congratulations on your selection', 'pleased to inform you that you',
    'happy to inform you that you',
    # Round schedule
    'aptitude test scheduled', 'aptitude test on',
    'technical interview scheduled', 'technical round on',
    'hr interview scheduled', 'hr round on',
    'coding round on', 'coding test on',
    'group discussion on', 'written test on',
    'online assessment link', 'hackerrank link', 'hackerearth link',
    'report at', 'report to', 'venue for the interview',
    'interview schedule', 'test schedule',
    # Offer / rejection
    'offer letter', 'appointment letter', 'offer of employment',
    'date of joining', 'joining date is', 'report on',
    'regret to inform you', 'not been selected for',
    'not shortlisted for', 'we regret to inform',
    'unfortunately you have not', 'could not make it',
    # PPO
    'pre placement offer', 'pre-placement offer',
]

# ---------------------------------------------------------------------------
# WEAK PLACEMENT KEYWORDS — need word boundary or context check
# These appear in non-placement emails too, so use carefully
# ---------------------------------------------------------------------------
WEAK_PLACEMENT_KEYWORDS = [
    'internship', 'recruitment', 'hiring', 'placement',
    'shortlisted', 'selected for', 'offer letter',
    'campus drive', 'job offer',
]

# Short keywords needing strict word boundary
WORD_BOUNDARY_KEYWORDS = {
    'ppo': r'\bppo\b',
    'lpa': r'\blpa\b',
    'ctc': r'\bctc\b',
}


def is_placement_email(text, subject):
    """
    3-tier keyword filter:
    Tier 1: Spam block — if any spam keyword found, return False immediately
    Tier 2: Strong placement signal — if any strong keyword found, return True
    Tier 3: Weak signals with word boundary — only for short ambiguous words
    """
    combined = (text + ' ' + subject).lower()

    # Tier 1: Block spam
    for keyword in SPAM_KEYWORDS:
        if keyword in combined:
            return False

    # Tier 2: Strong placement signals — full phrases, no ambiguity
    for keyword in STRONG_PLACEMENT_KEYWORDS:
        if keyword in combined:
            return True

    # Tier 3: Word boundary for short ambiguous keywords
    for keyword, pattern in WORD_BOUNDARY_KEYWORDS.items():
        if re.search(pattern, combined):
            return True

    # Tier 4: Weak keywords — only if subject line also looks placement-related
    subject_lower = subject.lower()
    placement_subject_signals = [
        'hiring', 'recruitment', 'internship', 'placement', 'drive',
        'shortlist', 'selected', 'offer', 'interview', 'assessment',
        'job', 'career opportunity', 'opportunity at', 'joining'
    ]
    subject_is_placement = any(sig in subject_lower for sig in placement_subject_signals)

    if subject_is_placement:
        for keyword in WEAK_PLACEMENT_KEYWORDS:
            if keyword in combined:
                return True

    return False


# ---------------------------------------------------------------------------
# DEPARTMENT ALIASES
# ---------------------------------------------------------------------------
DEPT_ALIASES = {
    'cse':     ['computer science', 'computer science and engineering',
                'computer science & engineering', 'cs', 'b.tech cse',
                'computer science engineering'],
    'it':      ['information technology', 'information technology and engineering',
                'information technology & engineering', 'i.t', 'i.t.'],
    'ece':     ['electronics and communication', 'electronics & communication',
                'electronics and communication engineering', 'ec',
                'electronics communication engineering'],
    'eee':     ['electrical and electronics', 'electrical & electronics',
                'electrical and electronics engineering', 'ee',
                'electrical electronics engineering'],
    'mech':    ['mechanical', 'mechanical engineering', 'me',
                'mechanical and automation', 'manufacturing engineering'],
    'civil':   ['civil', 'civil engineering', 'civil and structural'],
    'aids':    ['ai and data science', 'artificial intelligence and data science',
                'ai & ds', 'artificial intelligence', 'ai/ds'],
    'aiml':    ['ai and machine learning', 'artificial intelligence and machine learning',
                'ai & ml', 'aiml engineering'],
    'csbs':    ['computer science and business systems', 'cs and business systems'],
    'iot':     ['internet of things', 'iot engineering'],
    'chem':    ['chemical', 'chemical engineering', 'chemical technology'],
    'biotech': ['biotechnology', 'biotech engineering', 'biological sciences'],
    'mba':     ['business administration', 'management', 'mba finance', 'mba marketing'],
    'auto':    ['automobile', 'automobile engineering', 'automotive engineering'],
    'aero':    ['aeronautical', 'aeronautical engineering', 'aerospace', 'aerospace engineering'],
    'marine':  ['marine engineering', 'marine technology'],
    'mining':  ['mining engineering', 'mining technology'],
    'textile': ['textile technology', 'textile engineering'],
    'rubber':  ['rubber and plastics', 'polymer technology'],
    'food':    ['food technology', 'food processing'],
    'fashion': ['fashion technology', 'fashion design'],
    'arch':    ['architecture', 'b.arch'],
    'pharma':  ['pharmacy', 'pharmaceutical technology', 'b.pharm'],
}


def normalize_dept(dept):
    if not dept:
        return ''
    d = dept.lower().strip().rstrip('.')
    if d in DEPT_ALIASES:
        return d
    for canonical, aliases in DEPT_ALIASES.items():
        if d in [a.lower() for a in aliases]:
            return canonical
    return d


def dept_matches_any(user_dept, required_depts):
    if not required_depts:
        return True
    user_norm = normalize_dept(user_dept)
    for req in required_depts:
        req_norm = normalize_dept(req)
        if user_norm == req_norm:
            return True
        if user_dept.lower().strip() == req.lower().strip():
            return True
    return False


def is_vague_department(dept_list):
    if not dept_list:
        return False
    vague_phrases = [
        'allied', 'related', 'core', 'all engineering', 'technical',
        'science and technology', 'and related', 'similar disciplines',
        'relevant', 'equivalent', 'other engineering'
    ]
    for dept in dept_list:
        dept_lower = dept.lower()
        if normalize_dept(dept) in DEPT_ALIASES:
            continue
        if any(phrase in dept_lower for phrase in vague_phrases):
            return True
        if len(dept.split()) > 4:
            return True
    return False


def resolve_departments_with_ai(raw_departments, email_text, user_dept):
    try:
        prompt = f"""A placement email mentions these eligible departments: {raw_departments}
Email context (first 500 chars): {email_text[:500]}
Student department: {user_dept}
Available codes: CSE, IT, ECE, EEE, MECH, CIVIL, AIDS, AIML, CSBS, IOT, CHEM, BIOTECH, MBA, AUTO, AERO

Rules:
- "CSE and allied branches" includes IT, AIDS, AIML, CSBS, IOT
- "core CS" includes CSE, IT, AIDS, AIML
- "all engineering branches" means all eligible
- "ECE and related" includes ECE, EEE
- "mechanical and allied" includes MECH, AUTO, AERO

Return ONLY JSON:
{{"is_eligible": true, "resolved_departments": ["CSE", "IT"], "reason": "IT is allied to CSE"}}"""

        response = client.chat.completions.create(
            messages=[
                {'role': 'system', 'content': 'Department eligibility resolver. Return only valid JSON.'},
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL, temperature=0.0, max_tokens=200
        )
        result = parse_llm_response(response.choices[0].message.content)
        if result:
            return result.get('is_eligible', False), result.get('resolved_departments', raw_departments)
        return False, raw_departments
    except Exception as e:
        print(f'resolve_departments_with_ai error: {e}')
        return False, raw_departments


# ---------------------------------------------------------------------------
# SYNONYM MAP
# ---------------------------------------------------------------------------
SYNONYMS = {
    'javascript':        ['js', 'java script', 'es6', 'es2015'],
    'typescript':        ['ts', 'type script'],
    'python':            ['py', 'python3', 'python 3'],
    'java':              ['core java', 'java se', 'java ee'],
    'c++':               ['cpp', 'c plus plus', 'cplusplus'],
    'c#':                ['csharp', 'c sharp'],
    'kotlin':            ['kotlin android'],
    'swift':             ['swift ios', 'swiftui'],
    'go':                ['golang', 'go lang'],
    'rust':              ['rust lang'],
    'scala':             ['scala lang'],
    'r':                 ['r language', 'r programming', 'r studio'],
    'matlab':            ['mat lab', 'matrix laboratory'],
    'php':               ['php7', 'php8'],
    'ruby':              ['ruby on rails', 'ror'],
    'react':             ['reactjs', 'react.js', 'react js', 'react native'],
    'angular':           ['angularjs', 'angular.js', 'angular 2+'],
    'vue':               ['vuejs', 'vue.js', 'vue js', 'vue 3'],
    'nextjs':            ['next.js', 'next js'],
    'html':              ['html5', 'html 5'],
    'css':               ['css3', 'css 3'],
    'tailwind':          ['tailwindcss', 'tailwind css'],
    'bootstrap':         ['bootstrap 5'],
    'nodejs':            ['node.js', 'node js', 'node'],
    'express':           ['expressjs', 'express.js'],
    'django':            ['django rest framework', 'drf'],
    'flask':             ['flask python'],
    'fastapi':           ['fast api'],
    'spring':            ['spring boot', 'spring mvc', 'spring framework'],
    'laravel':           ['laravel php'],
    'graphql':           ['graph ql'],
    'rest api':          ['restful api', 'rest apis', 'restful', 'rest'],
    'mongodb':           ['mongo', 'mongo db'],
    'mysql':             ['my sql'],
    'postgresql':        ['postgres', 'postgres sql'],
    'redis':             ['redis cache'],
    'firebase':          ['firebase db', 'firestore'],
    'oracle':            ['oracle db', 'oracle database', 'plsql', 'pl/sql'],
    'elasticsearch':     ['elastic search'],
    'sql':               ['structured query language', 't-sql'],
    'aws':               ['amazon web services', 'amazon aws'],
    'azure':             ['microsoft azure', 'ms azure'],
    'gcp':               ['google cloud', 'google cloud platform'],
    'docker':            ['docker container', 'docker compose'],
    'kubernetes':        ['k8s', 'kube'],
    'jenkins':           ['jenkins ci'],
    'terraform':         ['terraform iac'],
    'ci/cd':             ['cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
    'linux':             ['ubuntu', 'centos', 'bash scripting', 'shell scripting', 'bash', 'shell'],
    'git':               ['github', 'gitlab', 'bitbucket', 'version control'],
    'machine learning':  ['ml', 'machine learning algorithms'],
    'deep learning':     ['dl', 'neural networks', 'ann', 'cnn', 'rnn', 'lstm'],
    'tensorflow':        ['tf', 'tensor flow'],
    'pytorch':           ['torch', 'py torch'],
    'scikit-learn':      ['sklearn', 'scikit learn'],
    'pandas':            ['pandas python'],
    'numpy':             ['np', 'num py'],
    'opencv':            ['open cv', 'computer vision', 'cv2'],
    'nlp':               ['natural language processing', 'text mining', 'nltk', 'spacy'],
    'llm':               ['large language model', 'gpt', 'llama'],
    'tableau':           ['tableau desktop'],
    'power bi':          ['powerbi', 'microsoft power bi'],
    'excel':             ['microsoft excel', 'ms excel', 'advanced excel'],
    'data analysis':     ['data analytics'],
    'data structures':   ['dsa', 'data structures and algorithms', 'ds', 'algorithms'],
    'system design':     ['hld', 'lld', 'high level design', 'low level design'],
    'oops':              ['object oriented programming', 'oop', 'object oriented', 'ooad'],
    'dbms':              ['database management', 'database management system', 'rdbms'],
    'os':                ['operating system', 'operating systems'],
    'networking':        ['computer networks', 'cn', 'network fundamentals', 'tcp/ip'],
    'agile':             ['agile methodology', 'scrum', 'kanban', 'sprint'],
    'jira':              ['atlassian jira', 'jira software'],
    'vlsi':              ['very large scale integration', 'vlsi design'],
    'verilog':           ['verilog hdl', 'system verilog', 'systemverilog'],
    'vhdl':              ['vhsic hardware description language'],
    'fpga':              ['field programmable gate array', 'xilinx fpga', 'altera fpga'],
    'embedded systems':  ['embedded c', 'embedded programming', 'bare metal'],
    'arduino':           ['arduino uno', 'arduino ide'],
    'raspberry pi':      ['rpi', 'raspberry'],
    'autocad':           ['auto cad', 'autodesk autocad', 'autocad 2d', 'autocad 3d'],
    'solidworks':        ['solid works', 'solidworks cad'],
    'catia':             ['catia v5', 'catia v6', 'dassault catia'],
    'ansys':             ['ansys simulation', 'ansys mechanical', 'ansys fluent'],
    'fea':               ['finite element analysis', 'finite element method', 'fem'],
    'cfd':               ['computational fluid dynamics'],
    'cnc':               ['cnc machining', 'cnc programming'],
    'lean manufacturing':['lean', 'lean principles'],
    'six sigma':         ['6 sigma', 'six sigma green belt', 'six sigma black belt'],
    'quality control':   ['qc', 'quality management', 'quality assurance'],
    'staad pro':         ['staad.pro', 'staad pro software'],
    'revit':             ['autodesk revit', 'revit mep', 'revit structure'],
    'structural analysis':['structural design', 'structural engineering skills'],
    'financial modeling':['financial modelling', 'excel financial model'],
    'sap':               ['sap erp', 'sap s/4hana', 'sap hana'],
    'salesforce':        ['salesforce crm', 'sfdc'],
    'digital marketing': ['online marketing', 'digital advertising'],
    'seo':               ['search engine optimization'],
    'supply chain':      ['supply chain management', 'scm'],
    'business analysis': ['business analyst skills', 'requirements gathering'],
    'crm':               ['customer relationship management'],
    'postman':           ['api testing', 'postman api'],
}

ROLE_SKILL_MAP = {
    'software engineer':         ['java', 'python', 'data structures', 'algorithms', 'sql', 'git', 'rest api', 'oops'],
    'sde':                       ['java', 'python', 'data structures', 'algorithms', 'sql', 'git', 'oops', 'system design'],
    'software developer':        ['java', 'python', 'javascript', 'sql', 'git', 'oops'],
    'backend developer':         ['nodejs', 'python', 'java', 'rest api', 'mongodb', 'postgresql', 'docker', 'sql'],
    'frontend developer':        ['react', 'javascript', 'html', 'css', 'typescript', 'git'],
    'full stack developer':      ['react', 'nodejs', 'mongodb', 'javascript', 'typescript', 'git', 'sql', 'rest api'],
    'data analyst':              ['python', 'sql', 'excel', 'tableau', 'power bi', 'pandas', 'data analysis'],
    'data scientist':            ['python', 'machine learning', 'pandas', 'numpy', 'tensorflow', 'sql'],
    'ml engineer':               ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'sql'],
    'ai engineer':               ['python', 'machine learning', 'deep learning', 'nlp', 'pytorch', 'tensorflow'],
    'devops engineer':           ['docker', 'kubernetes', 'jenkins', 'terraform', 'aws', 'linux', 'ci/cd', 'git'],
    'cloud engineer':            ['aws', 'azure', 'gcp', 'terraform', 'docker', 'kubernetes', 'linux'],
    'system engineer':           ['java', 'python', 'linux', 'networking', 'sql', 'git', 'oops'],
    'vlsi engineer':             ['vlsi', 'verilog', 'vhdl', 'fpga'],
    'embedded systems engineer': ['embedded systems', 'c++', 'arduino', 'networking'],
    'mechanical engineer':       ['autocad', 'solidworks', 'catia', 'ansys', 'matlab', 'fea'],
    'civil engineer':            ['autocad', 'staad pro', 'revit', 'structural analysis'],
    'finance analyst':           ['financial modeling', 'excel', 'sql', 'power bi'],
    'business analyst':          ['sql', 'excel', 'power bi', 'business analysis', 'jira', 'agile'],
    'product manager':           ['agile', 'jira', 'sql', 'data analysis'],
    'analyst':                   ['sql', 'excel', 'python', 'data analysis', 'power bi'],
    'associate engineer':        ['java', 'python', 'sql', 'git', 'oops', 'data structures'],
    'graduate engineer trainee': ['java', 'python', 'sql', 'git', 'oops', 'data structures'],
    'get':                       ['java', 'python', 'sql', 'git', 'oops', 'data structures'],
    'trainee':                   ['java', 'python', 'sql', 'git', 'oops'],
    'consultant':                ['excel', 'sql', 'business analysis', 'data analysis'],
}


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

def extract_text_from_pdf_bytes(file_bytes):
    try:
        import fitz
        text = ''
        with fitz.open(stream=file_bytes, filetype='pdf') as doc:
            for page in doc:
                text += page.get_text()
        return text.strip()
    except Exception as e:
        print(f'PDF extraction error: {e}')
        return ''


def extract_text_from_docx_bytes(file_bytes):
    try:
        import docx
        import io
        doc = docx.Document(io.BytesIO(file_bytes))
        return '\n'.join([para.text for para in doc.paragraphs]).strip()
    except Exception as e:
        print(f'DOCX extraction error: {e}')
        return ''


def extract_text_from_csv_bytes(file_bytes):
    try:
        import pandas as pd
        import io
        df = pd.read_csv(io.BytesIO(file_bytes))
        return df.to_string(index=False)
    except Exception as e:
        return ''


def extract_text_from_excel_bytes(file_bytes):
    try:
        import pandas as pd
        import io
        xl = pd.ExcelFile(io.BytesIO(file_bytes))
        all_text = []
        for sheet in xl.sheet_names:
            df = xl.parse(sheet)
            all_text.append(f'[Sheet: {sheet}]\n{df.to_string(index=False)}')
        return '\n\n'.join(all_text)
    except Exception as e:
        return ''


def extract_attachment_text(attachments):
    if not attachments:
        return ''
    extracted_parts = []
    for attachment in attachments:
        try:
            filename  = attachment.get('filename', '')
            mime_type = attachment.get('mimeType', '')
            data_b64  = attachment.get('data', '')
            if not data_b64:
                continue
            file_bytes = base64.b64decode(data_b64)
            text = ''
            if mime_type == 'application/pdf' or filename.lower().endswith('.pdf'):
                text = extract_text_from_pdf_bytes(file_bytes)
            elif mime_type in ['application/msword',
                               'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] \
                 or filename.lower().endswith(('.doc', '.docx')):
                text = extract_text_from_docx_bytes(file_bytes)
            elif mime_type == 'text/csv' or filename.lower().endswith('.csv'):
                text = extract_text_from_csv_bytes(file_bytes)
            elif mime_type in ['application/vnd.ms-excel',
                               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] \
                 or filename.lower().endswith(('.xls', '.xlsx')):
                text = extract_text_from_excel_bytes(file_bytes)
            elif mime_type.startswith('text/'):
                text = file_bytes.decode('utf-8', errors='ignore')
            if text:
                extracted_parts.append(f'\n--- Attachment: {filename} ---\n{text}')
        except Exception as e:
            print(f'Attachment extraction error for {attachment.get("filename","unknown")}: {e}')
            continue
    return '\n'.join(extracted_parts)


def smart_truncate_attachment(attachment_text, user, max_chars=5000):
    if not attachment_text:
        return ''
    text_lower = attachment_text.lower()
    identifiers = []
    for cd in user.get('customDetails', []):
        val = cd.get('value', '').strip()
        if val and len(val) >= 4:
            identifiers.append(val.lower())
    reg = user.get('registerNumber', '').strip()
    if reg and len(reg) >= 4:
        identifiers.append(reg.lower())
    email_addr = user.get('loginEmail', '').strip()
    if email_addr:
        identifiers.append(email_addr.lower())
    for identifier in identifiers:
        idx = text_lower.find(identifier)
        if idx != -1:
            start  = max(0, idx - 2000)
            end    = min(len(attachment_text), idx + 2000)
            header = attachment_text[:500] if start > 0 else ''
            return header + '\n...\n' + attachment_text[start:end]
    return attachment_text[:max_chars]


def parse_llm_response(content):
    try:
        content = content.strip()
        if content.startswith('```'):
            content = re.sub(r'^```(?:json)?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)
        json_start = content.find('{')
        if json_start > 0:
            content = content[json_start:]
        json_end = content.rfind('}')
        if json_end != -1 and json_end < len(content) - 1:
            content = content[:json_end + 1]
        return json.loads(content.strip())
    except json.JSONDecodeError as e:
        print(f'JSON parse error: {e}\nRaw: {content[:300]}')
        return None


def coerce_types(parsed):
    if not parsed:
        return parsed
    for field in ['min_cgpa', 'min_tenth', 'min_twelfth']:
        val = parsed.get(field)
        if val is not None:
            try:
                num_match = re.search(r'[\d.]+', str(val))
                parsed[field] = float(num_match.group()) if num_match else None
            except:
                parsed[field] = None
    for field in ['max_backlogs', 'bond_years', 'batch_year']:
        val = parsed.get(field)
        if val is not None:
            try:
                parsed[field] = int(re.search(r'\d+', str(val)).group())
            except:
                parsed[field] = None
    for field in ['confidence', 'shortlist_confidence']:
        val = parsed.get(field)
        if val is not None:
            try:
                parsed[field] = min(1.0, max(0.0, float(val)))
            except:
                parsed[field] = 0.5
    for field in ['is_placement_related', 'is_user_shortlisted', 'is_dream_company']:
        val = parsed.get(field)
        if val is not None and not isinstance(val, bool):
            parsed[field] = str(val).lower() in ('true', '1', 'yes')
    for field in ['required_skills', 'good_to_have_skills', 'tech_stack', 'departments']:
        val = parsed.get(field)
        if val is None:
            parsed[field] = []
        elif isinstance(val, str):
            parsed[field] = [v.strip() for v in val.split(',') if v.strip()]
        elif not isinstance(val, list):
            parsed[field] = []
    return parsed


def check_shortlist_python(full_text, user):
    """
    Deterministic shortlist detection — no LLM involved.
    Checks all user identifiers in this priority order:
    1. Custom field values (college-specific IDs)
    2. College email
    3. Personal email
    4. Register number
    5. Full name (with context check)
    """
    if not full_text:
        return False, None, None, 0.0
    text_lower = full_text.lower()

    # Priority 1: Custom field values (register number, roll number, etc.)
    for cd in user.get('customDetails', []):
        val = cd.get('value', '').strip()
        key = cd.get('key', 'ID')
        if val and len(val) >= 4:
            if val.lower() in text_lower:
                return True, key, val, 0.99

    # Priority 2: College email
    login_email = user.get('loginEmail', '').strip()
    if login_email and login_email.lower() in text_lower:
        return True, 'College Email', login_email, 0.99

    # Priority 3: Personal email
    personal_email = user.get('personalEmail', '').strip()
    if personal_email and personal_email.lower() in text_lower:
        return True, 'Personal Email', personal_email, 0.99

    # Priority 4: Register number
    register_number = user.get('registerNumber', '').strip()
    if register_number and len(register_number) >= 4:
        if register_number.lower() in text_lower:
            return True, 'Register Number', register_number, 0.99

    # Priority 5: Full name with context check
    name = user.get('name', '').strip()
    if name and len(name) >= 5:
        name_pattern = r'\b' + re.escape(name.lower()) + r'\b'
        if re.search(name_pattern, text_lower):
            name_idx = text_lower.find(name.lower())
            context = text_lower[max(0, name_idx - 100):name_idx + 100]
            list_indicators = ['\n', 's.no', 'sr.', 'sl.no', '\t', '|', 'reg', 'roll']
            if any(ind in context for ind in list_indicators):
                return True, 'Name', name, 0.85

    return False, None, None, 0.0


def infer_skills_from_role(job_role, existing_skills):
    if existing_skills:
        return existing_skills, False
    if not job_role:
        return [], False
    job_lower = job_role.lower().strip()
    if job_lower in ROLE_SKILL_MAP:
        return ROLE_SKILL_MAP[job_lower], True
    for key, skills in ROLE_SKILL_MAP.items():
        if job_lower in key or key in job_lower:
            return skills, True
    job_words = set(job_lower.split())
    best_key, best_overlap = None, 0
    for key in ROLE_SKILL_MAP:
        overlap = len(job_words & set(key.split()))
        if overlap > best_overlap:
            best_overlap = overlap
            best_key = key
    if best_key and best_overlap >= 1:
        return ROLE_SKILL_MAP[best_key], True
    return [], False


def build_preparation_links_with_search(company_name):
    """
    Build dynamic preparation links using web search via Groq.
    Falls back to constructed search URLs if search fails.
    """
    if not company_name:
        return []

    c_search = company_name.strip().replace(' ', '+')
    c_slug   = re.sub(r'[^a-z0-9]+', '-', company_name.strip().lower()).strip('-')

    # Base links — always available, dynamically built
    base_links = [
        {
            'title': f'{company_name} interview experience',
            'url':   f'https://www.google.com/search?q={c_search}+campus+placement+interview+experience+site:geeksforgeeks.org+OR+site:glassdoor.co.in+OR+site:ambitionbox.com',
            'type':  'search'
        },
        {
            'title': f'{company_name} placement questions GFG',
            'url':   f'https://www.geeksforgeeks.org/company/{c_slug}/',
            'type':  'geeksforgeeks'
        },
        {
            'title': f'{company_name} reviews AmbitionBox',
            'url':   f'https://www.ambitionbox.com/reviews/{c_slug}-reviews',
            'type':  'ambitionbox'
        },
        {
            'title': f'{company_name} salary Glassdoor',
            'url':   f'https://www.glassdoor.co.in/Reviews/{c_slug}-reviews-SRCH_KE0,{len(c_slug)}.htm',
            'type':  'glassdoor'
        },
        {
            'title': f'{company_name} LinkedIn',
            'url':   f'https://www.linkedin.com/company/{c_slug}',
            'type':  'linkedin'
        },
        {
            'title': f'{company_name} interview questions',
            'url':   f'https://www.google.com/search?q={c_search}+interview+questions+for+freshers+placement',
            'type':  'search'
        },
    ]

    # Try to get specific links via LLM web search
    try:
        search_prompt = f"""Find the exact URLs for {company_name} on these platforms:
1. GeeksForGeeks company page (geeksforgeeks.org/company/...)
2. AmbitionBox reviews page (ambitionbox.com/reviews/...)  
3. LinkedIn company page (linkedin.com/company/...)
4. Glassdoor reviews (glassdoor.co.in/Reviews/...)

Return ONLY this JSON with real URLs if you know them, or null if unsure:
{{
  "gfg_url": null,
  "ambitionbox_url": null,
  "linkedin_url": null,
  "glassdoor_url": null
}}

Company: {company_name}
Only return URLs you are confident about. Return null for any you are not sure about."""

        response = client.chat.completions.create(
            messages=[
                {'role': 'system', 'content': 'You are a URL finder. Return only valid JSON with real URLs or null. No explanation.'},
                {'role': 'user', 'content': search_prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.0,
            max_tokens=300
        )
        url_data = parse_llm_response(response.choices[0].message.content)

        if url_data:
            enriched_links = []

            gfg = url_data.get('gfg_url')
            if gfg and 'geeksforgeeks.org' in str(gfg):
                enriched_links.append({'title': f'{company_name} on GeeksForGeeks', 'url': gfg, 'type': 'geeksforgeeks'})
            else:
                enriched_links.append(base_links[1])

            amb = url_data.get('ambitionbox_url')
            if amb and 'ambitionbox.com' in str(amb):
                enriched_links.append({'title': f'{company_name} reviews - AmbitionBox', 'url': amb, 'type': 'ambitionbox'})
            else:
                enriched_links.append(base_links[2])

            li = url_data.get('linkedin_url')
            if li and 'linkedin.com' in str(li):
                enriched_links.append({'title': f'{company_name} - LinkedIn', 'url': li, 'type': 'linkedin'})
            else:
                enriched_links.append(base_links[4])

            gd = url_data.get('glassdoor_url')
            if gd and 'glassdoor' in str(gd):
                enriched_links.append({'title': f'{company_name} salary - Glassdoor', 'url': gd, 'type': 'glassdoor'})
            else:
                enriched_links.append(base_links[3])

            # Always add Google search as final option
            enriched_links.append(base_links[0])
            enriched_links.append(base_links[5])

            return enriched_links

    except Exception as e:
        print(f'Link search error (non-fatal): {e}')

    return base_links


def extract_skills_from_text(text):
    if not text:
        return []
    text_lower = text.lower()
    found_skills = set()
    for canonical, aliases in SYNONYMS.items():
        if re.search(r'\b' + re.escape(canonical) + r'\b', text_lower):
            found_skills.add(canonical)
            continue
        for alias in aliases:
            if re.search(r'\b' + re.escape(alias) + r'\b', text_lower):
                found_skills.add(canonical)
                break
    return sorted(list(found_skills))


def check_with_synonyms(skill, student_skills_set, synonyms):
    skill_lower = skill.lower()
    if skill_lower in student_skills_set:
        return True
    if skill_lower in synonyms:
        for alias in synonyms[skill_lower]:
            if alias.lower() in student_skills_set:
                return True
    for canonical, aliases in synonyms.items():
        if skill_lower in [a.lower() for a in aliases]:
            if canonical in student_skills_set:
                return True
    return False


def role_matches_interests(job_role, interested_roles):
    if not job_role or not interested_roles:
        return False
    job_lower = job_role.lower().strip()
    for role in interested_roles:
        role_lower = role.lower().strip()
        if job_lower == role_lower or job_lower in role_lower or role_lower in job_lower:
            return True
    return False


def get_skills_for_role(job_role):
    if not job_role:
        return []
    job_lower = job_role.lower().strip()
    if job_lower in ROLE_SKILL_MAP:
        return ROLE_SKILL_MAP[job_lower]
    for key, skills in ROLE_SKILL_MAP.items():
        if job_lower in key or key in job_lower:
            return skills
    return []


def build_empty_response():
    return {
        'is_placement_related': True,
        'category': 'general',
        'confidence': 0.5,
        'is_reminder': False,
        'email_type_explanation': 'Placement email detected',
        'company_name': None,
        'job_role': None,
        'job_description': None,
        'location': None,
        'salary': None,
        'ctc': None,
        'stipend': None,
        'deadline': None,
        'work_mode': None,
        'apply_link': None,
        'batch_year': None,
        'required_skills': [],
        'good_to_have_skills': [],
        'tech_stack': [],
        'min_cgpa': None,
        'min_tenth': None,
        'min_twelfth': None,
        'max_backlogs': None,
        'departments': [],
        'degree_required': None,
        'bond_years': None,
        'bond_amount': None,
        'company_type': None,
        'company_description': None,
        'is_dream_company': False,
        'is_user_shortlisted': False,
        'shortlist_confidence': 0.0,
        'shortlist_reason': None,
        'matched_field': None,
        'matched_value': None,
        'detection_source': None,
        'shortlist_round_details': None,
        'next_round_type': None,
        'next_round_date': None,
        'next_round_venue': None,
        'apply_suggestion': None,
        'apply_suggestion_reason': None,
        'preparation_links': [],
        'skills_inferred_from_role': False,
        'joining_date': None,
        'offer_details': None,
    }


# ---------------------------------------------------------------------------
# CALL 1 — Email classifier
# Determines: is it placement? what type exactly?
# Small, fast, cheap — runs on EVERY email
# ---------------------------------------------------------------------------
def classify_email(text, subject, attachment_text):
    attachment_section = f'\nAttachment:\n{attachment_text[:1500]}' if attachment_text else ''

    prompt = f"""You are a placement email classifier for Indian engineering college students.

Read this email carefully and answer two questions:
1. Is this a PLACEMENT/JOB related email?
2. If yes, what exact type is it?

Subject: {subject}
Email Body:
{text[:3000]}
{attachment_section}

QUESTION 1 — IS THIS PLACEMENT RELATED?
A placement related email is DIRECTLY about:
- A company recruiting/hiring students from campus
- Results of a selection process (shortlist/rejection)
- Schedule for interviews, tests, or assessments for a job
- A job offer letter or appointment
- Reminder about a job application deadline

NOT placement related (return false):
- Educational programmes, bootcamps, paid courses (even by tech companies)
- College events, guest lectures, seminars, awareness sessions
- Scholarships, study abroad, exchange programmes
- Fee payment, exam schedules, internal notices
- Career talks/webinars not involving actual hiring
- Any event where a company is sharing knowledge but NOT actively hiring

QUESTION 2 — WHAT TYPE? (only if placement related)
- job_posting: Company announcing visit or recruiting from campus. Includes:
  * Emails with eligible branches, eligibility criteria, CGPA requirements
  * Placement announcements even without apply link (date TBD emails)
  * Any email where a company is coming to campus to hire students
  * Registration/apply link for job/internship- shortlist: Results announced, list of selected/shortlisted students
- interview: Schedule for upcoming interview/technical/HR round with date+venue
- assessment: Online test link, aptitude/coding test scheduled with date
- offer: Job offer letter, appointment letter, CTC revealed, joining date given
- rejection: Not selected, regret email, process closed
- deadline: Reminder about existing job application deadline only
- general: Placement related but does not fit above types

Return ONLY this JSON:
{{
  "is_placement_related": true,
  "email_type": "job_posting",
  "confidence": 0.95,
  "company_name": "TCS",
  "reasoning": "one sentence explaining classification decision"
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a strict placement email classifier. '
                        'Educational programmes, bootcamps, college events, guest lectures '
                        'are NEVER placement related even if organized by tech companies. '
                        'Only actual hiring/recruitment is placement related. '
                        'Return only valid JSON. No markdown.'
                    )
                },
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.0,
            max_tokens=250
        )
        result = parse_llm_response(response.choices[0].message.content)
        if result:
            result = coerce_types(result)
            return result
    except Exception as e:
        print(f'classify_email error: {e}')

    return {'is_placement_related': False, 'email_type': 'unclassified', 'confidence': 0.5, 'company_name': None}


# ---------------------------------------------------------------------------
# CALL 2A — Job posting extractor
# ---------------------------------------------------------------------------
def extract_job_posting(text, subject, attachment_text, user, company_name_hint):
    attachment_section = f'\nAttachment:\n{attachment_text[:4000]}' if attachment_text else ''
    dept = user.get('department', '')
    degree = user.get('degree', '')
    cgpa = user.get('cgpa', '')
    batch = user.get('batchYear', '')

    prompt = f"""Extract all job/internship details from this placement email.

Subject: {subject}
Email:
{text[:4000]}
{attachment_section}

Company (already identified): {company_name_hint or 'extract from email'}
Student context: Dept={dept}, Degree={degree}, CGPA={cgpa}, Batch={batch}

EXTRACTION RULES:
1. SKILLS: Extract ONLY skills explicitly written. If none mentioned → return []
2. ELIGIBILITY: Extract ONLY what is explicitly stated. Never guess defaults.
   - min_cgpa: only if email states a minimum (e.g. "7.0 CGPA" → 7.0) else null
   - min_tenth/min_twelfth: only if explicitly stated else null
   - max_backlogs: "no active backlogs"→0, "max X backlogs"→X, not mentioned→null
   - departments: SHORT CODES ONLY (CSE, IT, ECE, EEE, MECH, CIVIL, AIDS, AIML, CSBS, IOT)
     "all branches" or not mentioned → []
   - degree_required: "B.Tech"/"M.Tech" etc or null
3. SALARY: Include units. "6 LPA", "15000/month". Fulltime→ctc, Internship→stipend
4. DEADLINE: ISO format if possible, else exact text from email
5. JOB TYPE: 
   - internship: if stipend/intern/internship explicitly mentioned
   - fulltime: if CTC/full time/core offer/dream offer/placement/job offer mentioned
   - fulltime: if email is from placement cell about company visit with no type mentioned
   - default to fulltime for campus placement announcements
6. COMPANY TYPE: product/service/startup/MNC/PSU — infer from email
7. IS DREAM: true only if email explicitly says "dream"/"super dream"/"special drive"
8. APPLY SUGGESTION based on student profile vs requirements:
   apply=meets all, maybe=meets most, skip=clearly not eligible
9. DEGREE: degree_required must be a single string ONLY, never an array.
   If multiple degrees eligible join with slash: "B.Tech/M.Tech" not ["B.Tech","M.Tech"]
   If not mentioned → null

Return ONLY this JSON:
{{
  "company_name": null,
  "job_role": null,
  "job_type": "internship",
  "job_description": null,
  "location": null,
  "salary": null,
  "ctc": null,
  "stipend": null,
  "deadline": null,
  "work_mode": null,
  "apply_link": null,
  "batch_year": null,
  "required_skills": [],
  "good_to_have_skills": [],
  "tech_stack": [],
  "min_cgpa": null,
  "min_tenth": null,
  "min_twelfth": null,
  "max_backlogs": null,
  "departments": [],
  "degree_required": null,
  "bond_years": null,
  "bond_amount": null,
  "company_type": null,
  "company_description": null,
  "is_dream_company": false,
  "apply_suggestion": null,
  "apply_suggestion_reason": null,
  "confidence": 0.9
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    'role': 'system',
                    'content': (
                        'You are a placement email data extractor. '
                        'Extract only what is explicitly written. '
                        'NEVER guess eligibility values. '
                        'Departments as short codes only (CSE, IT, ECE etc). '
                        'degree_required must always be a string never an array. '
                        'Return only valid JSON. No markdown.'
                    )
                },
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.1,
            max_tokens=1200
        )
        result = parse_llm_response(response.choices[0].message.content)
        return coerce_types(result) if result else None
    except Exception as e:
        print(f'extract_job_posting error: {e}')
        return None


# ---------------------------------------------------------------------------
# CALL 2B — Shortlist round detail extractor
# Only called when Python already confirmed student is in list
# ---------------------------------------------------------------------------
def extract_shortlist_details(text, subject, attachment_text, company_name_hint):
    attachment_section = f'\nAttachment:\n{attachment_text[:3000]}' if attachment_text else ''

    prompt = f"""This is a confirmed shortlist/selection email. Extract round details.

Company: {company_name_hint or 'extract from email'}
Subject: {subject}
Email:
{text[:4000]}
{attachment_section}

Extract ALL available information:
- Round number (Round 1, Phase 1, Stage 1, first round)
- Round type: aptitude/coding/technical/hr/gd/assignment
- Date: look for "15th April", "April 15", "15/04/2024", "Monday 14th"
- Time: "10:00 AM", "10 AM", "2:30 PM"
- Venue: hall name, room number, block, building, "online", zoom/meet/teams link
- Duration: "90 minutes", "1 hour"
- Instructions: what to bring, dress code, laptop requirement
- Is this also an offer? (CTC mentioned, joining date given)
- Is this a rejection? ("not selected" mentioned)

Return ONLY this JSON:
{{
  "company_name": null,
  "email_type_explanation": "one sentence",
  "is_final_offer": false,
  "is_rejection": false,
  "ctc": null,
  "stipend": null,
  "joining_date": null,
  "shortlist_round_details": {{
    "round_number": 1,
    "round_type": "aptitude",
    "round_date": null,
    "round_time": null,
    "round_venue": null,
    "is_online": false,
    "meeting_link": null,
    "duration": null,
    "instructions": null
  }},
  "next_round_type": null,
  "next_round_date": null,
  "next_round_venue": null,
  "confidence": 0.95
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    'role': 'system',
                    'content': 'Extract round details from shortlist email. Return only valid JSON. No markdown.'
                },
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.0,
            max_tokens=700
        )
        result = parse_llm_response(response.choices[0].message.content)
        return coerce_types(result) if result else None
    except Exception as e:
        print(f'extract_shortlist_details error: {e}')
        return None


# ---------------------------------------------------------------------------
# CALL 2C — Interview / Assessment detail extractor
# ---------------------------------------------------------------------------
def extract_round_details(text, subject, attachment_text, company_name_hint):
    attachment_section = f'\nAttachment:\n{attachment_text[:2000]}' if attachment_text else ''

    prompt = f"""Extract round schedule details from this placement email.

Company: {company_name_hint or 'extract from email'}
Subject: {subject}
Email:
{text[:3000]}
{attachment_section}

Extract:
- Round type (aptitude/coding/technical/hr/gd)
- Date, time, venue or online link
- Duration
- Instructions for students
- Any new shortlist information

Return ONLY this JSON:
{{
  "company_name": null,
  "email_type_explanation": "one sentence",
  "next_round_type": null,
  "next_round_date": null,
  "next_round_venue": null,
  "shortlist_round_details": {{
    "round_number": null,
    "round_type": null,
    "round_date": null,
    "round_time": null,
    "round_venue": null,
    "is_online": false,
    "meeting_link": null,
    "duration": null,
    "instructions": null
  }},
  "confidence": 0.9
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    'role': 'system',
                    'content': 'Extract round schedule details. Return only valid JSON. No markdown.'
                },
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.0,
            max_tokens=500
        )
        result = parse_llm_response(response.choices[0].message.content)
        return coerce_types(result) if result else None
    except Exception as e:
        print(f'extract_round_details error: {e}')
        return None


# ---------------------------------------------------------------------------
# CALL 2D — Offer / Rejection / Deadline extractor
# ---------------------------------------------------------------------------
def extract_simple_details(text, subject, attachment_text, company_name_hint, email_type):
    attachment_section = f'\nAttachment:\n{attachment_text[:1500]}' if attachment_text else ''

    type_instruction = {
        'offer':    'Extract: CTC/stipend, joining date, any conditions, company name',
        'rejection':'Extract: company name, which stage they reached, any feedback given',
        'deadline': 'Extract: company name, new deadline date, what the deadline is for',
        'general':  'Extract: company name, what this email is about',
    }.get(email_type, 'Extract company name and key information')

    prompt = f"""Extract key details from this {email_type} placement email.

Company: {company_name_hint or 'extract from email'}
Subject: {subject}
Email:
{text[:2500]}
{attachment_section}

{type_instruction}

Return ONLY this JSON:
{{
  "company_name": null,
  "email_type_explanation": "one sentence",
  "ctc": null,
  "stipend": null,
  "joining_date": null,
  "deadline": null,
  "confidence": 0.9
}}"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    'role': 'system',
                    'content': 'Extract placement email details. Return only valid JSON. No markdown.'
                },
                {'role': 'user', 'content': prompt}
            ],
            model=GROQ_MODEL,
            temperature=0.0,
            max_tokens=300
        )
        result = parse_llm_response(response.choices[0].message.content)
        return coerce_types(result) if result else None
    except Exception as e:
        print(f'extract_simple_details error: {e}')
        return None


# ---------------------------------------------------------------------------
# ROUTES
# ---------------------------------------------------------------------------

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': GROQ_MODEL}), 200


@app.route('/extract-resume', methods=['POST'])
def extract_resume():
    try:
        text = ''
        if request.files and 'file' in request.files:
            file = request.files['file']
            filename = file.filename.lower()
            file_bytes = file.read()
            if filename.endswith('.pdf'):
                text = extract_text_from_pdf_bytes(file_bytes)
            elif filename.endswith(('.doc', '.docx')):
                text = extract_text_from_docx_bytes(file_bytes)
            else:
                text = file_bytes.decode('utf-8', errors='ignore')
        elif request.json:
            data      = request.json
            file_path = data.get('filePath', '')
            data_b64  = data.get('data', '')
            mime_type = data.get('mimeType', '')
            filename  = data.get('filename', '')
            if file_path and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    file_bytes = f.read()
                if file_path.lower().endswith('.pdf'):
                    text = extract_text_from_pdf_bytes(file_bytes)
                elif file_path.lower().endswith(('.doc', '.docx')):
                    text = extract_text_from_docx_bytes(file_bytes)
                else:
                    text = file_bytes.decode('utf-8', errors='ignore')
            elif data_b64:
                file_bytes = base64.b64decode(data_b64)
                if mime_type == 'application/pdf' or filename.lower().endswith('.pdf'):
                    text = extract_text_from_pdf_bytes(file_bytes)
                elif mime_type in ['application/msword',
                                   'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] \
                     or filename.lower().endswith(('.doc', '.docx')):
                    text = extract_text_from_docx_bytes(file_bytes)
                else:
                    text = file_bytes.decode('utf-8', errors='ignore')

        extracted_skills = extract_skills_from_text(text)
        return jsonify({
            'success': True, 'text': text[:8000],
            'length': len(text), 'skills': extracted_skills
        }), 200
    except Exception as e:
        print(f'extract_resume error: {e}')
        return jsonify({'success': False, 'text': '', 'skills': [], 'error': str(e)}), 200


@app.route('/analyze-email', methods=['POST'])
def analyze_email():
    try:
        data = request.json
        if not data:
            return jsonify({'is_placement_related': False, 'category': 'unclassified'}), 200

        text        = data.get('text', '')
        subject     = data.get('subject', '')
        user        = data.get('user', {})
        attachments = data.get('attachments', [])

        # ── GATE 1: Python keyword filter (fast, free) ─────────────────────
        if not is_placement_email(text, subject):
            return jsonify({'is_placement_related': False, 'category': 'unclassified'}), 200

        # ── Extract attachments ─────────────────────────────────────────────
        attachment_text_full   = extract_attachment_text(attachments)
        attachment_text_prompt = smart_truncate_attachment(attachment_text_full, user)
        full_text              = text + '\n' + attachment_text_full

        # ── GATE 2: LLM classifier (accurate, catches edge cases) ───────────
        classification = classify_email(text, subject, attachment_text_prompt)

        if not classification.get('is_placement_related', False):
            return jsonify({'is_placement_related': False, 'category': 'unclassified'}), 200

        email_type   = classification.get('email_type', 'general')
        company_name = classification.get('company_name')
        confidence   = classification.get('confidence', 0.8)

        # ── Build base response ─────────────────────────────────────────────
        response = build_empty_response()
        response['confidence']    = confidence
        response['company_name']  = company_name

        # ── GATE 3: Python shortlist detection (deterministic, no LLM) ─────
        # Run for ALL email types — student might be in list even in job posting email
        is_shortlisted, matched_field, matched_value, shortlist_conf = check_shortlist_python(
            full_text, user
        )

        if is_shortlisted:
            response['is_user_shortlisted']   = True
            response['shortlist_confidence']   = shortlist_conf
            response['matched_field']          = matched_field
            response['matched_value']          = matched_value
            response['detection_source']       = f'{matched_field}: {matched_value}'

        # ── ROUTE TO CORRECT EXTRACTOR based on LLM classification ─────────

        if email_type == 'job_posting':
            # Full job detail extraction
            details = extract_job_posting(text, subject, attachment_text_prompt, user, company_name)
            if details:
                for field in [
                    'company_name', 'job_role', 'job_description', 'location',
                    'salary', 'ctc', 'stipend', 'deadline', 'work_mode',
                    'apply_link', 'batch_year', 'required_skills',
                    'good_to_have_skills', 'tech_stack', 'min_cgpa',
                    'min_tenth', 'min_twelfth', 'max_backlogs', 'departments',
                    'degree_required', 'bond_years', 'bond_amount',
                    'company_type', 'company_description', 'is_dream_company',
                    'apply_suggestion', 'apply_suggestion_reason'
                ]:
                    if field in details and details[field] is not None:
                        response[field] = details[field]

                # Determine category from job type
                job_type = details.get('job_type', 'internship')
                response['category'] = 'fulltime' if job_type == 'fulltime' else 'internship'

                # Infer skills from role if empty
                skills, inferred = infer_skills_from_role(
                    response.get('job_role'), response.get('required_skills', [])
                )
                response['required_skills']          = skills
                response['skills_inferred_from_role'] = inferred

                # Normalise departments
                response['departments'] = [
                    normalize_dept(d) for d in response.get('departments', []) if d
                ]

            response['email_type_explanation'] = classification.get('reasoning', 'Job posting email')

        elif email_type == 'shortlist':
            response['category'] = 'shortlist'
            # LLM extracts round details — Python already handled shortlist detection
            details = extract_shortlist_details(text, subject, attachment_text_prompt, company_name)
            if details:
                if details.get('company_name'):
                    response['company_name'] = details['company_name']
                response['email_type_explanation'] = details.get('email_type_explanation', '')
                response['shortlist_round_details'] = details.get('shortlist_round_details')
                response['next_round_type']         = details.get('next_round_type')
                response['next_round_date']         = details.get('next_round_date')
                response['next_round_venue']        = details.get('next_round_venue')
                response['ctc']                     = details.get('ctc')
                response['stipend']                 = details.get('stipend')
                response['joining_date']            = details.get('joining_date')
                if details.get('is_final_offer'):
                    response['category'] = 'offer'
                if details.get('is_rejection'):
                    response['category'] = 'rejection'
                # Fill next_round from shortlist_round_details if not set
                srd = response.get('shortlist_round_details')
                if srd and not response['next_round_type']:
                    response['next_round_type']  = srd.get('round_type')
                    response['next_round_date']  = srd.get('round_date')
                    response['next_round_venue'] = srd.get('round_venue')

        elif email_type in ['interview', 'assessment']:
            response['category'] = email_type
            details = extract_round_details(text, subject, attachment_text_prompt, company_name)
            if details:
                if details.get('company_name'):
                    response['company_name'] = details['company_name']
                response['email_type_explanation'] = details.get('email_type_explanation', '')
                response['next_round_type']         = details.get('next_round_type')
                response['next_round_date']         = details.get('next_round_date')
                response['next_round_venue']        = details.get('next_round_venue')
                response['shortlist_round_details'] = details.get('shortlist_round_details')

        elif email_type == 'offer':
            response['category'] = 'offer'
            details = extract_simple_details(text, subject, attachment_text_prompt, company_name, 'offer')
            if details:
                if details.get('company_name'):
                    response['company_name'] = details['company_name']
                response['email_type_explanation'] = details.get('email_type_explanation', '')
                response['ctc']          = details.get('ctc')
                response['stipend']      = details.get('stipend')
                response['joining_date'] = details.get('joining_date')

        elif email_type == 'rejection':
            response['category'] = 'rejection'
            details = extract_simple_details(text, subject, attachment_text_prompt, company_name, 'rejection')
            if details:
                if details.get('company_name'):
                    response['company_name'] = details['company_name']
                response['email_type_explanation'] = details.get('email_type_explanation', '')

        elif email_type == 'deadline':
            response['category'] = 'deadline'
            response['is_reminder'] = True
            details = extract_simple_details(text, subject, attachment_text_prompt, company_name, 'deadline')
            if details:
                if details.get('company_name'):
                    response['company_name'] = details['company_name']
                response['email_type_explanation'] = details.get('email_type_explanation', '')
                response['deadline'] = details.get('deadline')

        else:
            # general
            response['category'] = 'general'
            response['email_type_explanation'] = classification.get('reasoning', 'General placement email')

        # ── Build preparation links for any email with company name ─────────
        if response.get('company_name'):
            response['preparation_links'] = build_preparation_links_with_search(
                response['company_name']
            )

        return jsonify(response), 200

    except Exception as e:
        print(f'analyze_email error: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'is_placement_related': False, 'category': 'unclassified'}), 200


@app.route('/check-eligibility', methods=['POST'])
def check_eligibility():
    try:
        data = request.json
        if not data:
            return jsonify({'is_eligible': False, 'checks': {}, 'failed_reasons': ['No data provided']}), 200

        user           = data.get('user', {})
        criteria       = data.get('criteria', {})
        email_text     = data.get('emailText', '')
        checks         = {}
        failed_reasons = []

        min_cgpa  = criteria.get('minCGPA')
        user_cgpa = user.get('cgpa')
        if min_cgpa is not None:
            passed = (float(user_cgpa) if user_cgpa is not None else 0.0) >= float(min_cgpa)
            checks['cgpa'] = {'required': min_cgpa, 'userValue': user_cgpa, 'passed': passed}
            if not passed: failed_reasons.append(f'CGPA {user_cgpa} < required {min_cgpa}')
        else:
            checks['cgpa'] = {'required': None, 'userValue': user_cgpa, 'passed': True}

        min_tenth  = criteria.get('minTenthPercent')
        user_tenth = user.get('tenthPercentage')
        if min_tenth is not None:
            passed = (float(user_tenth) if user_tenth is not None else 0.0) >= float(min_tenth)
            checks['tenth'] = {'required': min_tenth, 'userValue': user_tenth, 'passed': passed}
            if not passed: failed_reasons.append(f'10th {user_tenth}% < required {min_tenth}%')
        else:
            checks['tenth'] = {'required': None, 'userValue': user_tenth, 'passed': True}

        min_twelfth  = criteria.get('minTwelfthPercent')
        user_twelfth = user.get('twelfthPercentage')
        if min_twelfth is not None:
            passed = (float(user_twelfth) if user_twelfth is not None else 0.0) >= float(min_twelfth)
            checks['twelfth'] = {'required': min_twelfth, 'userValue': user_twelfth, 'passed': passed}
            if not passed: failed_reasons.append(f'12th {user_twelfth}% < required {min_twelfth}%')
        else:
            checks['twelfth'] = {'required': None, 'userValue': user_twelfth, 'passed': True}

        max_backlogs  = criteria.get('maxBacklogs')
        user_backlogs = user.get('activeBacklogs')
        if max_backlogs is not None:
            passed = (int(user_backlogs) if user_backlogs is not None else 0) <= int(max_backlogs)
            checks['backlog'] = {'required': max_backlogs, 'userValue': user_backlogs, 'passed': passed}
            if not passed: failed_reasons.append(f'Active backlogs {user_backlogs} > allowed {max_backlogs}')
        else:
            checks['backlog'] = {'required': None, 'userValue': user_backlogs, 'passed': True}

        required_depts = criteria.get('departments', [])
        user_dept      = user.get('department', '')
        if required_depts and len(required_depts) > 0:
            passed = dept_matches_any(user_dept, required_depts)
            if not passed and is_vague_department(required_depts):
                ai_eligible, resolved = resolve_departments_with_ai(required_depts, email_text, user_dept)
                passed = ai_eligible
                required_depts = resolved
            checks['department'] = {'required': required_depts, 'userValue': user_dept, 'passed': passed}
            if not passed:
                failed_reasons.append(f'Department {user_dept} not in {required_depts}')
        else:
            checks['department'] = {'required': [], 'userValue': user_dept, 'passed': True}

        required_degree = criteria.get('degreeRequired')
        user_degree     = user.get('degree', '')
        if required_degree:
            passed = (user_degree.lower() in required_degree.lower() or
                      required_degree.lower() in user_degree.lower())
            checks['degree'] = {'required': required_degree, 'userValue': user_degree, 'passed': passed}
            if not passed: failed_reasons.append(f'Degree {user_degree} does not match {required_degree}')
        else:
            checks['degree'] = {'required': None, 'userValue': user_degree, 'passed': True}

        return jsonify({
            'is_eligible': len(failed_reasons) == 0,
            'checks': checks,
            'failed_reasons': failed_reasons
        }), 200

    except Exception as e:
        print(f'check_eligibility error: {e}')
        return jsonify({'is_eligible': False, 'checks': {}, 'failed_reasons': [f'Error: {str(e)}']}), 200


@app.route('/match-skills', methods=['POST'])
def match_skills():
    try:
        data = request.json
        if not data:
            return jsonify({'match_score': 0, 'matched_skills': [], 'missing_skills': [], 'role_match': False}), 200

        job_skills       = [s.lower() for s in data.get('jobSkills', [])]
        job_role         = data.get('jobRole', '')
        manual_skills    = [s.lower() for s in data.get('studentSkills', [])]
        resume_skills    = [s.lower() for s in data.get('resumeSkills', [])]
        interested_roles = data.get('interestedRoles', [])
        all_student_skills = list(set(manual_skills + resume_skills))

        if not job_skills:
            return jsonify({'match_score': 0, 'matched_skills': [], 'missing_skills': [], 'role_match': False}), 200

        expanded = set(all_student_skills)
        for skill in all_student_skills:
            if skill in SYNONYMS:
                for alias in SYNONYMS[skill]: expanded.add(alias.lower())
            for canonical, aliases in SYNONYMS.items():
                if skill in [a.lower() for a in aliases]:
                    expanded.add(canonical.lower())

        matched, missing = [], []
        for skill in job_skills:
            (matched if check_with_synonyms(skill, expanded, SYNONYMS) else missing).append(skill)

        base_score = round((len(matched) / len(job_skills)) * 100) if job_skills else 0
        role_match = role_matches_interests(job_role, interested_roles)
        role_bonus = 10 if role_match else 0
        final_score = min(100, base_score + role_bonus)

        if role_match and missing:
            role_skills = get_skills_for_role(job_role)
            missing = [s for s in missing if s in role_skills] + [s for s in missing if s not in role_skills]

        return jsonify({
            'match_score':       final_score,
            'matched_skills':    matched,
            'missing_skills':    missing,
            'role_match':        role_match,
            'role_bonus_applied': role_bonus
        }), 200

    except Exception as e:
        print(f'match_skills error: {e}')
        return jsonify({'match_score': 0, 'matched_skills': [], 'missing_skills': [], 'role_match': False}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8000))
    print(f'SPEI AI Service running on port {port}')
    print(f'Using model: {GROQ_MODEL}')
    app.run(host='0.0.0.0', port=port, debug=False)