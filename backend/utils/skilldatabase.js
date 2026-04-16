/**
 * skillDatabase.js
 * backend/utils/skillDatabase.js
 *
 * Two exports:
 *  1. SKILL_SYNONYMS — canonical skill → array of aliases (used by Python app.py)
 *     Node.js version kept here for any server-side fallback matching.
 *
 *  2. ROLE_SKILL_MAP — interested role → array of relevant skills
 *     When a student's interestedRoles matches a job role, skills from this map
 *     get a boost weight during match scoring in Python's /match-skills endpoint.
 *
 * Coverage:
 *   CSE / IT / AI / Data Science
 *   ECE / EEE / EIE / Embedded
 *   Mechanical / Automobile / Production
 *   Civil / Structural
 *   Chemical / Biotech
 *   MBA / Management
 */

// ─── Skill Synonym Map ──────────────────────────────────────────────────────
// Key = canonical lowercase name
// Value = array of aliases/short forms (all lowercase)
const SKILL_SYNONYMS = {
    // ── Programming Languages ─────────────────────────────────────────────
    javascript:         ['js', 'java script', 'javascript es6', 'es6', 'es2015'],
    typescript:         ['ts', 'type script'],
    python:             ['py', 'python3', 'python 3'],
    java:               ['core java', 'java se', 'java ee'],
    'c++':              ['cpp', 'c plus plus', 'cplusplus'],
    'c#':               ['csharp', 'c sharp', 'dotnet c#'],
    kotlin:             ['kotlin android'],
    swift:              ['swift ios', 'swiftui'],
    go:                 ['golang', 'go lang'],
    rust:               ['rust lang'],
    scala:              ['scala lang'],
    r:                  ['r language', 'r programming', 'r studio'],
    matlab:             ['mat lab', 'matrix laboratory'],
    php:                ['php7', 'php8'],
    ruby:               ['ruby on rails', 'ror'],
  
    // ── Web Frontend ──────────────────────────────────────────────────────
    react:              ['reactjs', 'react.js', 'react js', 'react native'],
    angular:            ['angularjs', 'angular.js', 'angular 2+'],
    vue:                ['vuejs', 'vue.js', 'vue js', 'vue 3'],
    nextjs:             ['next.js', 'next js'],
    svelte:             ['svelte js'],
    html:               ['html5', 'html 5'],
    css:                ['css3', 'css 3', 'cascading style sheets'],
    tailwind:           ['tailwindcss', 'tailwind css'],
    bootstrap:          ['bootstrap 5', 'twitter bootstrap'],
  
    // ── Web Backend ───────────────────────────────────────────────────────
    nodejs:             ['node.js', 'node js', 'node'],
    express:            ['expressjs', 'express.js', 'express js'],
    django:             ['django rest framework', 'drf'],
    flask:              ['flask python'],
    fastapi:            ['fast api'],
    spring:             ['spring boot', 'spring mvc', 'spring framework'],
    laravel:            ['laravel php'],
    nestjs:             ['nest.js', 'nest js'],
    graphql:            ['graph ql'],
    'rest api':         ['restful api', 'rest apis', 'restful', 'rest'],
  
    // ── Databases ────────────────────────────────────────────────────────
    mongodb:            ['mongo', 'mongo db'],
    mysql:              ['my sql'],
    postgresql:         ['postgres', 'postgres sql'],
    redis:              ['redis cache'],
    firebase:           ['firebase db', 'firestore'],
    oracle:             ['oracle db', 'oracle database', 'plsql', 'pl/sql'],
    elasticsearch:      ['elastic search'],
    cassandra:          ['apache cassandra'],
    sqlite:             ['sqlite3'],
    sql:                ['structured query language', 't-sql', 'pl-sql'],
  
    // ── Cloud & DevOps ───────────────────────────────────────────────────
    aws:                ['amazon web services', 'amazon aws'],
    azure:              ['microsoft azure', 'ms azure'],
    gcp:                ['google cloud', 'google cloud platform'],
    docker:             ['docker container', 'docker compose'],
    kubernetes:         ['k8s', 'kube'],
    jenkins:            ['jenkins ci'],
    terraform:          ['terraform iac'],
    ansible:            ['ansible automation'],
    'ci/cd':            ['cicd', 'ci cd', 'continuous integration', 'continuous deployment'],
    linux:              ['ubuntu', 'centos', 'bash scripting', 'shell scripting', 'bash', 'shell'],
    git:                ['github', 'gitlab', 'bitbucket', 'version control'],
    nginx:              ['nginx server'],
  
    // ── AI / ML / Data ───────────────────────────────────────────────────
    'machine learning': ['ml', 'machine learning algorithms'],
    'deep learning':    ['dl', 'neural networks', 'ann', 'cnn', 'rnn', 'lstm'],
    tensorflow:         ['tf', 'tensor flow'],
    pytorch:            ['torch', 'py torch'],
    'scikit-learn':     ['sklearn', 'scikit learn'],
    pandas:             ['pandas python', 'pandas df'],
    numpy:              ['np', 'num py'],
    opencv:             ['open cv', 'computer vision', 'cv2'],
    nlp:                ['natural language processing', 'text mining', 'nltk', 'spacy'],
    llm:                ['large language model', 'gpt', 'llama', 'gemini'],
    'data analysis':    ['data analytics', 'data analyst skills'],
    tableau:            ['tableau desktop'],
    'power bi':         ['powerbi', 'microsoft power bi'],
    excel:              ['microsoft excel', 'ms excel', 'advanced excel'],
    'google analytics': ['ga4', 'google analytics 4'],
  
    // ── Mobile ───────────────────────────────────────────────────────────
    android:            ['android development', 'android studio'],
    ios:                ['ios development', 'xcode'],
    flutter:            ['flutter dart'],
    'react native':     ['rn', 'react-native'],
  
    // ── ECE / EEE / Embedded ────────────────────────────────────────────
    vlsi:               ['very large scale integration', 'vlsi design'],
    verilog:            ['verilog hdl', 'system verilog', 'systemverilog'],
    vhdl:               ['vhsic hardware description language'],
    fpga:               ['field programmable gate array', 'xilinx fpga', 'altera fpga'],
    'pcb design':       ['pcb layout', 'printed circuit board', 'kicad', 'altium'],
    'embedded systems': ['embedded c', 'embedded programming', 'bare metal'],
    arduino:            ['arduino uno', 'arduino ide'],
    'raspberry pi':     ['rpi', 'raspberry'],
    'stm32':            ['stm32 microcontroller', 'stm32cubemx'],
    keil:               ['keil uvision', 'keil mdk'],
    labview:            ['lab view', 'ni labview'],
    plc:                ['programmable logic controller', 'siemens plc', 'allen bradley'],
    scada:              ['supervisory control', 'hmi scada'],
    iot:                ['internet of things', 'iot devices', 'iot protocols'],
    'signal processing':['dsp', 'digital signal processing'],
    '5g':               ['5g technology', '5g networks', 'lte'],
    'rf design':        ['rf engineering', 'radio frequency'],
    multisim:           ['ni multisim', 'circuit simulation'],
    proteus:            ['proteus eda', 'proteus simulation'],
    cadence:            ['cadence virtuoso', 'cadence design'],
    matlab:             ['mat lab'],
  
    // ── Mechanical / Automobile ──────────────────────────────────────────
    autocad:            ['auto cad', 'autodesk autocad', 'autocad 2d', 'autocad 3d'],
    solidworks:         ['solid works', 'solidworks cad'],
    catia:              ['catia v5', 'catia v6', 'dassault catia'],
    ansys:              ['ansys simulation', 'ansys mechanical', 'ansys fluent'],
    creo:               ['creo parametric', 'ptc creo', 'pro engineer'],
    'nx cad':           ['siemens nx', 'unigraphics nx', 'nx siemens'],
    'fusion 360':       ['autodesk fusion', 'fusion360'],
    hypermesh:          ['hyper mesh', 'altair hypermesh'],
    fea:                ['finite element analysis', 'finite element method', 'fem'],
    cfd:                ['computational fluid dynamics'],
    simulink:           ['matlab simulink', 'model based design'],
    cnc:                ['cnc machining', 'cnc programming', 'g-code'],
    'lean manufacturing':['lean', 'lean principles'],
    'six sigma':        ['6 sigma', 'six sigma green belt', 'six sigma black belt'],
    kaizen:             ['kaizen methodology', 'continuous improvement'],
    gdt:                ['geometric dimensioning and tolerancing', 'gd&t'],
    'quality control':  ['qc', 'quality management', 'quality assurance'],
    'cam software':     ['cam programming', 'computer aided manufacturing'],
    mechatronics:       ['mechantronics'],
  
    // ── Civil / Structural ───────────────────────────────────────────────
    'staad pro':        ['staad.pro', 'staad pro software'],
    etabs:              ['extended three dimensional analysis'],
    revit:              ['autodesk revit', 'revit mep', 'revit structure'],
    primavera:          ['oracle primavera', 'primavera p6'],
    bim:                ['building information modeling', 'building information modelling'],
    'sap2000':          ['sap 2000'],
    'ms project':       ['microsoft project'],
    'civil 3d':         ['autodesk civil 3d'],
    surveying:          ['land surveying', 'total station', 'theodolite'],
    'structural analysis':['structural design', 'structural engineering'],
    'construction management':['project management civil', 'site management'],
  
    // ── Chemical / Biotech ───────────────────────────────────────────────
    'aspen hysys':      ['hysys', 'aspentech', 'aspen plus'],
    comsol:             ['comsol multiphysics'],
    minitab:            ['minitab statistics'],
    'process simulation':['process modeling', 'chemical process simulation'],
    'pcr':              ['polymerase chain reaction'],
    fermentation:       ['fermentation technology', 'bioreactor'],
  
    // ── MBA / Management ─────────────────────────────────────────────────
    'financial modeling':['financial modelling', 'excel financial model'],
    'dcf':              ['discounted cash flow', 'dcf valuation'],
    'equity research':  ['equity analysis', 'stock analysis'],
    sap:                ['sap erp', 'sap s/4hana', 'sap hana'],
    salesforce:         ['salesforce crm', 'sfdc'],
    'digital marketing':['online marketing', 'digital advertising'],
    seo:                ['search engine optimization'],
    'google ads':       ['google adwords', 'ppc'],
    'supply chain':     ['supply chain management', 'scm'],
    logistics:          ['logistics management', 'freight'],
    'business analysis':['business analyst skills', 'requirements gathering'],
    crm:                ['customer relationship management'],
    'market research':  ['consumer research', 'market analysis'],
  }
  
  // ─── Role → Skills Map ───────────────────────────────────────────────────────
  // When a student's interestedRoles matches a job's jobRole,
  // the Python /match-skills endpoint gives a +10 score bonus
  // and these skills are highlighted as priority missing skills.
  const ROLE_SKILL_MAP = {
    // ── CSE / IT Roles ────────────────────────────────────────────────────
    'software engineer':          ['java', 'python', 'data structures', 'algorithms', 'sql', 'git', 'rest api'],
    'sde':                        ['java', 'python', 'data structures', 'algorithms', 'sql', 'git', 'rest api'],
    'software developer':         ['java', 'python', 'javascript', 'sql', 'git', 'oop'],
    'backend developer':          ['nodejs', 'python', 'java', 'rest api', 'mongodb', 'postgresql', 'docker'],
    'frontend developer':         ['react', 'javascript', 'html', 'css', 'typescript', 'tailwind'],
    'full stack developer':       ['react', 'nodejs', 'mongodb', 'javascript', 'typescript', 'git', 'rest api'],
    'web developer':              ['html', 'css', 'javascript', 'react', 'nodejs'],
    'mobile developer':           ['android', 'kotlin', 'react native', 'flutter', 'ios', 'swift'],
    'android developer':          ['android', 'kotlin', 'java', 'android studio', 'retrofit'],
    'ios developer':              ['swift', 'ios', 'xcode', 'swiftui'],
    'devops engineer':            ['docker', 'kubernetes', 'jenkins', 'terraform', 'aws', 'linux', 'ci/cd'],
    'cloud engineer':             ['aws', 'azure', 'gcp', 'terraform', 'docker', 'kubernetes'],
    'data analyst':               ['python', 'sql', 'excel', 'tableau', 'power bi', 'pandas', 'numpy'],
    'data scientist':             ['python', 'machine learning', 'pandas', 'numpy', 'tensorflow', 'sql', 'statistics'],
    'ml engineer':                ['python', 'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'mlops'],
    'ai engineer':                ['python', 'deep learning', 'nlp', 'tensorflow', 'pytorch', 'llm'],
    'data engineer':              ['python', 'sql', 'spark', 'hadoop', 'airflow', 'aws', 'kafka'],
    'cybersecurity analyst':      ['network security', 'ethical hacking', 'penetration testing', 'firewalls', 'linux'],
    'network engineer':           ['networking', 'cisco', 'tcp/ip', 'routing', 'switching', 'firewalls'],
    'database administrator':     ['sql', 'oracle', 'mysql', 'postgresql', 'mongodb', 'performance tuning'],
    'qa engineer':                ['manual testing', 'automation testing', 'selenium', 'jira', 'api testing'],
    'ui/ux designer':             ['figma', 'adobe xd', 'user research', 'wireframing', 'prototyping'],
    'product manager':            ['agile', 'scrum', 'jira', 'product roadmap', 'user stories', 'sql'],
    'business analyst':           ['sql', 'excel', 'power bi', 'requirements gathering', 'process mapping', 'jira'],
    'system analyst':             ['system design', 'uml', 'sql', 'business analysis', 'documentation'],
    'technical support':          ['linux', 'networking', 'troubleshooting', 'sql', 'ticketing systems'],
  
    // ── ECE / EEE Roles ───────────────────────────────────────────────────
    'vlsi engineer':              ['vlsi', 'verilog', 'vhdl', 'fpga', 'cadence', 'synthesis', 'timing analysis'],
    'rtl design engineer':        ['verilog', 'vhdl', 'systemverilog', 'fpga', 'cadence', 'synthesis'],
    'embedded systems engineer':  ['embedded c', 'c', 'microcontrollers', 'rtos', 'arduino', 'stm32', 'can', 'uart'],
    'iot engineer':               ['iot', 'embedded c', 'mqtt', 'raspberry pi', 'arduino', 'cloud platforms'],
    'rf engineer':                ['rf design', 'signal processing', 'antenna design', '5g', 'matlab'],
    'dsp engineer':               ['signal processing', 'matlab', 'labview', 'fpga', 'c++'],
    'hardware engineer':          ['pcb design', 'embedded systems', 'altium', 'circuit design', 'oscilloscope'],
    'power electronics engineer': ['power electronics', 'matlab simulink', 'plc', 'drives', 'inverter design'],
    'automation engineer':        ['plc', 'scada', 'labview', 'matlab', 'hmi', 'robotics'],
    'telecom engineer':           ['5g', 'lte', 'networking', 'signal processing', 'matlab'],
  
    // ── Mechanical Roles ─────────────────────────────────────────────────
    'mechanical engineer':        ['autocad', 'solidworks', 'catia', 'ansys', 'matlab'],
    'design engineer':            ['solidworks', 'catia', 'autocad', 'creo', 'gdt', 'fea'],
    'cad engineer':               ['solidworks', 'catia', 'autocad', 'creo', 'nx cad', 'fusion 360'],
    'simulation engineer':        ['ansys', 'fea', 'cfd', 'matlab simulink', 'hypermesh'],
    'manufacturing engineer':     ['cnc', 'lean manufacturing', 'six sigma', 'cam software', 'quality control'],
    'quality engineer':           ['six sigma', 'quality control', 'gdt', 'minitab', 'iso standards'],
    'maintenance engineer':       ['plc', 'hydraulics', 'pneumatics', 'predictive maintenance', 'autocad'],
    'automobile engineer':        ['autocad', 'catia', 'matlab', 'vehicle dynamics', 'engine design'],
    'production engineer':        ['cnc', 'lean manufacturing', 'autocad', 'production planning', 'erp'],
    'robotics engineer':          ['ros', 'python', 'c++', 'matlab', 'arduino', 'mechatronics'],
  
    // ── Civil Roles ───────────────────────────────────────────────────────
    'civil engineer':             ['autocad', 'staad pro', 'revit', 'etabs', 'structural analysis'],
    'structural engineer':        ['staad pro', 'etabs', 'sap2000', 'revit', 'structural analysis', 'autocad'],
    'site engineer':              ['autocad', 'construction management', 'surveying', 'ms project', 'quality control'],
    'geotechnical engineer':      ['autocad', 'plaxis', 'soil mechanics', 'foundation design'],
    'environmental engineer':     ['water treatment', 'waste management', 'autocad', 'environmental assessment'],
    'quantity surveyor':          ['autocad', 'ms excel', 'rate analysis', 'boq', 'estimation'],
    'bim engineer':               ['bim', 'revit', 'autocad', 'navisworks', 'coordination'],
    'project engineer civil':     ['primavera', 'ms project', 'autocad', 'construction management', 'site management'],
  
    // ── Chemical / Biotech Roles ─────────────────────────────────────────
    'chemical engineer':          ['aspen hysys', 'matlab', 'process simulation', 'autocad', 'safety engineering'],
    'process engineer':           ['aspen hysys', 'process simulation', 'pid tuning', 'autocad p&id'],
    'biotech engineer':           ['pcr', 'fermentation', 'cell culture', 'downstream processing', 'matlab'],
    'quality control chemist':    ['hplc', 'gcms', 'titration', 'analytical chemistry', 'documentation'],
  
    // ── MBA / Management Roles ────────────────────────────────────────────
    'finance analyst':            ['financial modeling', 'excel', 'dcf', 'sql', 'power bi', 'accounting'],
    'investment analyst':         ['equity research', 'dcf', 'financial modeling', 'bloomberg', 'excel'],
    'marketing analyst':          ['digital marketing', 'google analytics', 'seo', 'excel', 'sql', 'crm'],
    'operations analyst':         ['sql', 'excel', 'supply chain', 'erp', 'sap', 'process improvement'],
    'hr analyst':                 ['excel', 'hrms', 'recruitment', 'data analysis', 'powerpoint'],
    'supply chain analyst':       ['supply chain', 'sap', 'excel', 'logistics', 'erp', 'sql'],
    'management trainee':         ['excel', 'powerpoint', 'communication', 'leadership', 'problem solving'],
    'consultant':                 ['excel', 'powerpoint', 'data analysis', 'communication', 'problem solving'],
    'digital marketing specialist':['seo', 'google ads', 'digital marketing', 'social media marketing', 'analytics'],
  }
  
  // ─── Helper: normalize a role string for lookup ─────────────────────────────
  // Used to match student's interestedRoles[] against job's jobRole
  const normalizeRole = (role) => role.toLowerCase().trim().replace(/\s+/g, ' ')
  
  // ─── Get skills for a role ───────────────────────────────────────────────────
  const getSkillsForRole = (role) => {
    const normalized = normalizeRole(role)
    // Exact match first
    if (ROLE_SKILL_MAP[normalized]) return ROLE_SKILL_MAP[normalized]
    // Partial match — role contains a key or key contains role
    for (const [key, skills] of Object.entries(ROLE_SKILL_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) return skills
    }
    return []
  }
  
  // ─── Check if a job role matches any of student's interested roles ────────────
  const roleMatchesInterests = (jobRole, interestedRoles = []) => {
    if (!jobRole || !interestedRoles.length) return false
    const normalizedJob = normalizeRole(jobRole)
    return interestedRoles.some((role) => {
      const normalizedInterest = normalizeRole(role)
      return (
        normalizedJob.includes(normalizedInterest) ||
        normalizedInterest.includes(normalizedJob) ||
        normalizedJob === normalizedInterest
      )
    })
  }
  
  module.exports = {
    SKILL_SYNONYMS,
    ROLE_SKILL_MAP,
    normalizeRole,
    getSkillsForRole,
    roleMatchesInterests
  }