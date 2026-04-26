const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const CONTENT_DIR = path.join(ROOT_DIR, "content");

const sources = {
  cbseCurriculum2026_27: "https://cbseacademic.nic.in/curriculum_2027.html",
  cbseCurriculum2025_26: "https://cbseacademic.nic.in/curriculum_2026.html",
  ncertTextbooks: "https://ncert.nic.in/textbook.php?ln=en"
};

const subjectProfiles = {
  Mathematics: {
    verbs: ["reason step by step", "connect examples to rules", "check each calculation carefully"],
    quizTip: "Revise definitions, patterns, and solved examples before the quiz."
  },
  Science: {
    verbs: ["observe the concept clearly", "link ideas to experiments and daily life", "explain causes and effects in simple words"],
    quizTip: "Focus on scientific ideas, examples, and what happens in real-life situations."
  },
  History: {
    verbs: ["track timelines and people", "notice change over time", "connect events with causes and consequences"],
    quizTip: "Remember important events, terms, and the sequence of developments."
  },
  Geography: {
    verbs: ["read maps and patterns", "connect places with physical features", "explain human-environment relationships"],
    quizTip: "Keep key map ideas, locations, and processes fresh in your notes."
  },
  Civics: {
    verbs: ["understand institutions and citizens", "connect rules with everyday life", "explain rights and responsibilities clearly"],
    quizTip: "Revise key ideas, examples, and how institutions work in real life."
  },
  "Political Science": {
    verbs: ["understand democratic systems", "compare institutions and ideas", "explain public issues with examples"],
    quizTip: "Review core terms, institutions, and how political ideas apply in practice."
  },
  Economics: {
    verbs: ["connect concepts with everyday choices", "read examples and case situations", "explain economic ideas in practical language"],
    quizTip: "Remember definitions, examples, and how the concept appears in real life."
  },
  Physics: {
    verbs: ["focus on laws and relationships", "keep units and quantities accurate", "connect formulas with physical meaning"],
    quizTip: "Revise formulas, units, graphs, and physical interpretations before starting."
  },
  Chemistry: {
    verbs: ["track reactions and properties", "compare patterns across substances", "connect structure with behaviour"],
    quizTip: "Review definitions, reaction patterns, and important examples before the quiz."
  },
  Biology: {
    verbs: ["understand systems and functions", "connect structure with function", "remember key processes using clear diagrams or notes"],
    quizTip: "Revise processes, diagrams, examples, and important biological terms."
  },
  "Business Studies": {
    verbs: ["connect business ideas to real organisations", "understand management decisions", "use examples to explain principles"],
    quizTip: "Revise business terms, principles, and practical examples before the quiz."
  },
  Accountancy: {
    verbs: ["follow the logic of entries and records", "check formats carefully", "connect each transaction with its accounting effect"],
    quizTip: "Practice formats, journal logic, and the reason behind each accounting step."
  }
};

const socialScience6to8 = {
  6: {
    Mathematics: [
      "Knowing Our Numbers",
      "Whole Numbers",
      "Playing with Numbers",
      "Basic Geometrical Ideas",
      "Understanding Elementary Shapes",
      "Integers",
      "Fractions",
      "Decimals",
      "Data Handling",
      "Mensuration",
      "Algebra",
      "Ratio and Proportion",
      "Symmetry",
      "Practical Geometry"
    ],
    Science: [
      "Food: Where Does It Come From?",
      "Components of Food",
      "Fibre to Fabric",
      "Sorting Materials into Groups",
      "Separation of Substances",
      "Changes Around Us",
      "Getting to Know Plants",
      "Body Movements",
      "The Living Organisms and Their Surroundings",
      "Motion and Measurement of Distances",
      "Light, Shadows and Reflections",
      "Electricity and Circuits",
      "Fun with Magnets",
      "Water",
      "Air Around Us",
      "Garbage In, Garbage Out"
    ],
    History: [
      "What, Where, How and When?",
      "From Hunting-Gathering to Growing Food",
      "In the Earliest Cities",
      "What Books and Burials Tell Us",
      "Kingdoms, Kings and an Early Republic",
      "New Questions and Ideas",
      "From a Kingdom to an Empire",
      "Villages, Towns and Trade",
      "New Empires and Kingdoms",
      "Buildings, Paintings and Books"
    ],
    Geography: [
      "The Earth in the Solar System",
      "Globe: Latitudes and Longitudes",
      "Motions of the Earth",
      "Maps",
      "Major Domains of the Earth",
      "Major Landforms of the Earth",
      "Our Country: India",
      "India: Climate, Vegetation and Wildlife"
    ],
    Civics: [
      "Understanding Diversity",
      "Diversity and Discrimination",
      "What Is Government?",
      "Key Elements of a Democratic Government",
      "Panchayati Raj",
      "Rural Administration",
      "Urban Administration",
      "Rural Livelihoods",
      "Urban Livelihoods"
    ]
  },
  7: {
    Mathematics: [
      "Integers",
      "Fractions and Decimals",
      "Data Handling",
      "Simple Equations",
      "Lines and Angles",
      "The Triangle and Its Properties",
      "Congruence of Triangles",
      "Comparing Quantities",
      "Rational Numbers",
      "Practical Geometry",
      "Perimeter and Area",
      "Algebraic Expressions",
      "Exponents and Powers",
      "Symmetry",
      "Visualising Solid Shapes"
    ],
    Science: [
      "Nutrition in Plants",
      "Nutrition in Animals",
      "Fibre to Fabric",
      "Heat",
      "Acids, Bases and Salts",
      "Physical and Chemical Changes",
      "Weather, Climate and Adaptations of Animals to Climate",
      "Winds, Storms and Cyclones",
      "Soil",
      "Respiration in Organisms",
      "Transportation in Animals and Plants",
      "Reproduction in Plants",
      "Motion and Time",
      "Electric Current and Its Effects",
      "Light",
      "Water: A Precious Resource",
      "Forests: Our Lifeline",
      "Wastewater Story"
    ],
    History: [
      "Tracing Changes Through a Thousand Years",
      "New Kings and Kingdoms",
      "The Delhi Sultans",
      "The Mughal Empire",
      "Rulers and Buildings",
      "Towns, Traders and Craftspeople",
      "Tribes, Nomads and Settled Communities",
      "Devotional Paths to the Divine",
      "The Making of Regional Cultures",
      "Eighteenth-Century Political Formations"
    ],
    Geography: [
      "Environment",
      "Inside Our Earth",
      "Our Changing Earth",
      "Air",
      "Water",
      "Natural Vegetation and Wildlife",
      "Human Environment: Settlement, Transport and Communication",
      "Human Environment Interactions: The Tropical and the Subtropical Region",
      "Life in the Deserts"
    ],
    Civics: [
      "On Equality",
      "Role of the Government in Health",
      "How the State Government Works",
      "Growing Up as Boys and Girls",
      "Women Change the World",
      "Understanding Media",
      "Understanding Advertising",
      "Markets Around Us",
      "A Shirt in the Market",
      "Struggles for Equality"
    ]
  },
  8: {
    Mathematics: [
      "Rational Numbers",
      "Linear Equations in One Variable",
      "Understanding Quadrilaterals",
      "Practical Geometry",
      "Data Handling",
      "Squares and Square Roots",
      "Cubes and Cube Roots",
      "Comparing Quantities",
      "Algebraic Expressions and Identities",
      "Visualising Solid Shapes",
      "Mensuration",
      "Exponents and Powers",
      "Direct and Inverse Proportions",
      "Factorisation",
      "Introduction to Graphs",
      "Playing with Numbers"
    ],
    Science: [
      "Crop Production and Management",
      "Microorganisms: Friend and Foe",
      "Synthetic Fibres and Plastics",
      "Materials: Metals and Non-Metals",
      "Coal and Petroleum",
      "Combustion and Flame",
      "Conservation of Plants and Animals",
      "Cell: Structure and Functions",
      "Reproduction in Animals",
      "Reaching the Age of Adolescence",
      "Force and Pressure",
      "Friction",
      "Sound",
      "Chemical Effects of Electric Current",
      "Some Natural Phenomena",
      "Light",
      "Stars and the Solar System",
      "Pollution of Air and Water"
    ],
    History: [
      "How, When and Where",
      "From Trade to Territory",
      "Ruling the Countryside",
      "Tribals, Dikus and the Vision of a Golden Age",
      "When People Rebel",
      "Civilising the Native, Educating the Nation",
      "Women, Caste and Reform",
      "The Making of the National Movement",
      "India After Independence"
    ],
    Geography: [
      "Resources",
      "Land, Soil, Water, Natural Vegetation and Wildlife Resources",
      "Mineral and Power Resources",
      "Agriculture",
      "Industries",
      "Human Resources"
    ],
    Civics: [
      "The Indian Constitution",
      "Understanding Secularism",
      "Why Do We Need a Parliament?",
      "Understanding Laws",
      "Judiciary",
      "Understanding Our Criminal Justice System",
      "Understanding Marginalisation",
      "Confronting Marginalisation",
      "Public Facilities",
      "Law and Social Justice"
    ]
  }
};

const secondary = {
  9: {
    Mathematics: [
      "Number Systems",
      "Polynomials",
      "Coordinate Geometry",
      "Linear Equations in Two Variables",
      "Introduction to Euclid's Geometry",
      "Lines and Angles",
      "Triangles",
      "Quadrilaterals",
      "Areas of Parallelograms and Triangles",
      "Circles",
      "Constructions",
      "Heron's Formula",
      "Surface Areas and Volumes",
      "Statistics",
      "Probability"
    ],
    Science: [
      "Matter in Our Surroundings",
      "Is Matter Around Us Pure",
      "Atoms and Molecules",
      "Structure of the Atom",
      "The Fundamental Unit of Life",
      "Tissues",
      "Motion",
      "Force and Laws of Motion",
      "Gravitation",
      "Work and Energy",
      "Sound",
      "Why Do We Fall Ill",
      "Natural Resources",
      "Improvement in Food Resources"
    ],
    History: [
      "The French Revolution",
      "Socialism in Europe and the Russian Revolution",
      "Nazism and the Rise of Hitler",
      "Forest Society and Colonialism",
      "Pastoralists in the Modern World"
    ],
    Geography: [
      "India: Size and Location",
      "Physical Features of India",
      "Drainage",
      "Climate",
      "Natural Vegetation and Wild Life",
      "Population"
    ],
    "Political Science": [
      "What Is Democracy? Why Democracy?",
      "Constitutional Design",
      "Electoral Politics",
      "Working of Institutions",
      "Democratic Rights"
    ],
    Economics: [
      "The Story of Village Palampur",
      "People as Resource",
      "Poverty as a Challenge",
      "Food Security in India"
    ]
  },
  10: {
    Mathematics: [
      "Real Numbers",
      "Polynomials",
      "Pair of Linear Equations in Two Variables",
      "Quadratic Equations",
      "Arithmetic Progressions",
      "Triangles",
      "Coordinate Geometry",
      "Introduction to Trigonometry",
      "Some Applications of Trigonometry",
      "Circles",
      "Constructions",
      "Areas Related to Circles",
      "Surface Areas and Volumes",
      "Statistics",
      "Probability"
    ],
    Science: [
      "Chemical Reactions and Equations",
      "Acids, Bases and Salts",
      "Metals and Non-metals",
      "Carbon and Its Compounds",
      "Periodic Classification of Elements",
      "Life Processes",
      "Control and Coordination",
      "How Do Organisms Reproduce?",
      "Heredity and Evolution",
      "Light: Reflection and Refraction",
      "The Human Eye and the Colourful World",
      "Electricity",
      "Magnetic Effects of Electric Current",
      "Our Environment",
      "Sustainable Management of Natural Resources"
    ],
    History: [
      "The Rise of Nationalism in Europe",
      "Nationalism in India",
      "The Making of a Global World",
      "The Age of Industrialisation",
      "Print Culture and the Modern World"
    ],
    Geography: [
      "Resources and Development",
      "Forest and Wildlife Resources",
      "Water Resources",
      "Agriculture",
      "Minerals and Energy Resources",
      "Manufacturing Industries",
      "Lifelines of National Economy"
    ],
    "Political Science": [
      "Power Sharing",
      "Federalism",
      "Gender, Religion and Caste",
      "Political Parties",
      "Outcomes of Democracy",
      "Challenges to Democracy"
    ],
    Economics: [
      "Development",
      "Sectors of the Indian Economy",
      "Money and Credit",
      "Globalisation and the Indian Economy",
      "Consumer Rights"
    ]
  }
};

const seniorSecondary = {
  11: {
    Mathematics: [
      "Sets",
      "Relations and Functions",
      "Trigonometric Functions",
      "Complex Numbers and Quadratic Equations",
      "Linear Inequalities",
      "Permutations and Combinations",
      "Binomial Theorem",
      "Sequences and Series",
      "Straight Lines",
      "Conic Sections",
      "Introduction to Three-dimensional Geometry",
      "Limits and Derivatives",
      "Statistics",
      "Probability"
    ],
    Physics: [
      "Physical World and Measurement",
      "Kinematics",
      "Laws of Motion",
      "Work, Energy and Power",
      "Motion of System of Particles and Rigid Body",
      "Gravitation",
      "Properties of Bulk Matter",
      "Thermodynamics",
      "Behaviour of Perfect Gases and Kinetic Theory",
      "Oscillations and Waves"
    ],
    Chemistry: [
      "Some Basic Concepts of Chemistry",
      "Structure of Atom",
      "Classification of Elements and Periodicity in Properties",
      "Chemical Bonding and Molecular Structure",
      "Chemical Thermodynamics",
      "Equilibrium",
      "Redox Reactions",
      "Organic Chemistry: Some Basic Principles and Techniques",
      "Hydrocarbons"
    ],
    Biology: [
      "Diversity of the Living World",
      "Biological Classification",
      "Plant Kingdom",
      "Animal Kingdom",
      "Morphology of Flowering Plants",
      "Anatomy of Flowering Plants",
      "Structural Organisation in Animals",
      "Cell: The Unit of Life",
      "Biomolecules",
      "Cell Cycle and Cell Division",
      "Transport in Plants",
      "Mineral Nutrition",
      "Photosynthesis in Higher Plants",
      "Respiration in Plants",
      "Plant Growth and Development",
      "Digestion and Absorption",
      "Breathing and Exchange of Gases",
      "Body Fluids and Circulation",
      "Excretory Products and Their Elimination",
      "Locomotion and Movement",
      "Neural Control and Coordination",
      "Chemical Coordination and Integration"
    ],
    Economics: [
      "Introduction to Statistics in Economics",
      "Collection of Data",
      "Organisation of Data",
      "Presentation of Data",
      "Statistical Tools and Interpretation",
      "Introduction to Microeconomics",
      "Consumer's Equilibrium and Demand",
      "Producer Behaviour and Supply",
      "Forms of Market and Price Determination",
      "Simple Applications of Tools of Demand and Supply"
    ],
    "Business Studies": [
      "Nature and Purpose of Business",
      "Forms of Business Organisation",
      "Private, Public and Global Enterprises",
      "Business Services",
      "Emerging Modes of Business",
      "Social Responsibility of Business and Business Ethics",
      "Formation of a Company",
      "Sources of Business Finance",
      "Small Business",
      "Internal Trade",
      "International Business"
    ],
    Accountancy: [
      "Introduction to Accounting",
      "Theory Base of Accounting",
      "Recording of Transactions",
      "Bank Reconciliation Statement",
      "Trial Balance and Rectification of Errors",
      "Depreciation, Provisions and Reserves",
      "Bills of Exchange",
      "Financial Statements I",
      "Financial Statements II",
      "Accounts from Incomplete Records",
      "Computers in Accounting",
      "Computerised Accounting System"
    ],
    History: [
      "From the Beginning of Time",
      "Writing and City Life",
      "An Empire Across Three Continents",
      "The Central Islamic Lands",
      "Nomadic Empires",
      "The Three Orders",
      "Changing Cultural Traditions",
      "Confrontation of Cultures",
      "The Industrial Revolution",
      "Displacing Indigenous Peoples",
      "Paths to Modernisation"
    ],
    "Political Science": [
      "Constitution: Why and How?",
      "Rights in the Indian Constitution",
      "Election and Representation",
      "Executive",
      "Legislature",
      "Judiciary",
      "Federalism",
      "Local Governments",
      "Constitution as a Living Document",
      "The Philosophy of the Constitution",
      "Political Theory: An Introduction",
      "Freedom",
      "Equality",
      "Social Justice",
      "Rights",
      "Citizenship",
      "Nationalism",
      "Secularism",
      "Peace",
      "Development"
    ],
    Geography: [
      "Geography as a Discipline",
      "The Earth",
      "Landforms and Their Evolution",
      "Climate",
      "Water in the Atmosphere",
      "World Climate and Climate Change",
      "Water: Oceans",
      "Life on the Earth",
      "Biodiversity and Conservation",
      "India: Location",
      "Structure and Physiography",
      "Drainage System",
      "Climate of India",
      "Natural Vegetation",
      "Natural Hazards and Disasters"
    ]
  },
  12: {
    Mathematics: [
      "Relations and Functions",
      "Inverse Trigonometric Functions",
      "Matrices",
      "Determinants",
      "Continuity and Differentiability",
      "Applications of Derivatives",
      "Integrals",
      "Applications of Integrals",
      "Differential Equations",
      "Vector Algebra",
      "Three-dimensional Geometry",
      "Linear Programming",
      "Probability"
    ],
    Physics: [
      "Electrostatics",
      "Current Electricity",
      "Magnetic Effects of Current and Magnetism",
      "Electromagnetic Induction and Alternating Currents",
      "Electromagnetic Waves",
      "Optics",
      "Dual Nature of Radiation and Matter",
      "Atoms and Nuclei",
      "Electronic Devices"
    ],
    Chemistry: [
      "Solutions",
      "Electrochemistry",
      "Chemical Kinetics",
      "d- and f-Block Elements",
      "Coordination Compounds",
      "Haloalkanes and Haloarenes",
      "Alcohols, Phenols and Ethers",
      "Aldehydes, Ketones and Carboxylic Acids",
      "Amines",
      "Biomolecules"
    ],
    Biology: [
      "Reproduction in Organisms",
      "Sexual Reproduction in Flowering Plants",
      "Human Reproduction",
      "Reproductive Health",
      "Principles of Inheritance and Variation",
      "Molecular Basis of Inheritance",
      "Evolution",
      "Human Health and Disease",
      "Microbes in Human Welfare",
      "Biotechnology: Principles and Processes",
      "Biotechnology and Its Applications",
      "Organisms and Populations",
      "Ecosystem",
      "Biodiversity and Conservation",
      "Environmental Issues"
    ],
    Economics: [
      "National Income and Related Aggregates",
      "Money and Banking",
      "Determination of Income and Employment",
      "Government Budget and the Economy",
      "Balance of Payments",
      "Indian Economy on the Eve of Independence",
      "Indian Economy 1950-1990",
      "Liberalisation, Privatisation and Globalisation",
      "Human Capital Formation in India",
      "Rural Development",
      "Employment",
      "Sustainable Economic Development"
    ],
    "Business Studies": [
      "Nature and Significance of Management",
      "Principles of Management",
      "Business Environment",
      "Planning",
      "Organising",
      "Staffing",
      "Directing",
      "Controlling",
      "Financial Management",
      "Financial Markets",
      "Marketing",
      "Consumer Protection",
      "Project Work"
    ],
    Accountancy: [
      "Accounting for Partnership Firms: Fundamentals",
      "Goodwill: Nature and Valuation",
      "Change in Profit-sharing Ratio Among the Existing Partners",
      "Admission of a Partner",
      "Retirement and Death of a Partner",
      "Dissolution of Partnership Firm",
      "Issue of Shares",
      "Issue of Debentures",
      "Financial Statements of a Company",
      "Analysis of Financial Statements",
      "Accounting Ratios",
      "Cash Flow Statement"
    ],
    History: [
      "Bricks, Beads and Bones",
      "Kings, Farmers and Towns",
      "Kinship, Caste and Class",
      "Thinkers, Beliefs and Buildings",
      "Through the Eyes of Travellers",
      "Bhakti-Sufi Traditions",
      "An Imperial Capital: Vijayanagara",
      "Peasants, Zamindars and the State",
      "Kings and Chronicles",
      "Colonialism and the Countryside",
      "Rebels and the Raj",
      "Mahatma Gandhi and the Nationalist Movement",
      "Framing the Constitution"
    ],
    "Political Science": [
      "The Cold War Era",
      "The End of Bipolarity",
      "US Hegemony in World Politics",
      "Alternative Centres of Power",
      "Contemporary South Asia",
      "International Organisations",
      "Security in the Contemporary World",
      "Environment and Natural Resources",
      "Globalisation",
      "Challenges of Nation Building",
      "Era of One-Party Dominance",
      "Politics of Planned Development",
      "India's External Relations",
      "Challenges to and Restoration of the Congress System",
      "The Crisis of Democratic Order",
      "Regional Aspirations",
      "Recent Developments in Indian Politics"
    ],
    Geography: [
      "Human Geography: Nature and Scope",
      "The World Population Distribution, Density and Growth",
      "Human Development",
      "Primary Activities",
      "Secondary Activities",
      "Tertiary and Quaternary Activities",
      "Transport and Communication",
      "International Trade",
      "Human Settlements",
      "Population Distribution, Density, Growth and Composition in India",
      "Human Settlements in India",
      "Land Resources and Agriculture",
      "Water Resources",
      "Mineral and Energy Resources",
      "Planning and Sustainable Development in the Indian Context",
      "Transport and Communication in India",
      "International Trade in India"
    ]
  }
};

const syllabusMap = {
  ...socialScience6to8,
  ...secondary,
  ...seniorSecondary
};

const joinTextList = (items) => {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const inferConceptDetails = (subject, chapter) => {
  const name = String(chapter || "").toLowerCase();

  if (subject === "Mathematics") {
    if (/number|integer|real|rational/.test(name)) {
      return {
        theme: "how numbers are written, compared, and used in mathematical thinking",
        keyIdeas: ["place value", "ordering and comparison", "properties of operations"],
        application: "number sense helps students estimate, calculate, and check answers in daily life and higher mathematics"
      };
    }
    if (/fraction|decimal|ratio|proportion|percent/.test(name)) {
      return {
        theme: "how quantities are compared and represented in different forms",
        keyIdeas: ["equivalent forms", "comparison of parts and wholes", "numerical relationships"],
        application: "students use these ideas while measuring, sharing, and comparing quantities"
      };
    }
    if (/algebra|equation|polynomial|expression|progression|series|inequal|binomial/.test(name)) {
      return {
        theme: "patterns and relationships expressed with symbols and rules",
        keyIdeas: ["variables and symbols", "rules and structure", "step-by-step reasoning"],
        application: "algebra helps students move from arithmetic thinking to general mathematical reasoning"
      };
    }
    if (/geometry|angle|triangle|quadrilateral|circle|shape|solid|construction|coordinate|trigon|vector|matrix|determinant|conic|area|volume|mensuration|line/.test(name)) {
      return {
        theme: "space, shape, measurement, and geometric relationships",
        keyIdeas: ["properties of figures", "measurement and construction", "visual reasoning"],
        application: "geometric thinking supports drawing, measuring, and understanding spatial patterns"
      };
    }
    if (/data|statistics|probability/.test(name)) {
      return {
        theme: "collecting, organising, and interpreting information",
        keyIdeas: ["tables and graphs", "patterns in data", "chance and likelihood"],
        application: "students learn to read information carefully and make sensible conclusions"
      };
    }
  }

  if (subject === "Science" || subject === "Physics" || subject === "Chemistry" || subject === "Biology") {
    if (/food|nutrition|digestion|health|disease/.test(name)) {
      return {
        theme: "how living bodies get energy, grow, and stay healthy",
        keyIdeas: ["body needs", "functions of important components", "health and balance"],
        application: "these ideas help students connect science with food habits, fitness, and care of the body"
      };
    }
    if (/plant|crop|forest|photosynthesis|fibre|fabric/.test(name)) {
      return {
        theme: "living plants, their structure, growth, and usefulness",
        keyIdeas: ["plant functions", "natural materials", "links with environment and daily life"],
        application: "students begin to understand how nature supports food, materials, and ecosystems"
      };
    }
    if (/water|air|climate|weather|environment|resource|pollution|soil|ocean/.test(name)) {
      return {
        theme: "natural systems and how they support life on Earth",
        keyIdeas: ["cycles and balance", "human impact", "care and conservation"],
        application: "the chapter helps learners observe their surroundings and think about responsible use of resources"
      };
    }
    if (/motion|force|work|energy|sound|light|electric|magnet|gravity|wave|thermo|current|electro|optic/.test(name)) {
      return {
        theme: "physical processes that explain movement, energy, and natural phenomena",
        keyIdeas: ["cause and effect", "observation and explanation", "laws and patterns"],
        application: "students connect classroom science with machines, movement, light, sound, and technology"
      };
    }
    if (/matter|atom|molecule|chemical|reaction|acid|base|salt|metal|carbon|solution|kinetic|bond|equilibrium|redox|organic|hydrocarbon/.test(name)) {
      return {
        theme: "the composition of matter and the way substances behave and change",
        keyIdeas: ["particles and structure", "properties of substances", "chemical change"],
        application: "this helps students explain materials around them using scientific language and evidence"
      };
    }
    if (/cell|tissue|reproduction|heredity|evolution|micro|animal|organism|respiration|circulation|biotech|ecosystem|biodiversity/.test(name)) {
      return {
        theme: "life processes, living systems, and continuity of life",
        keyIdeas: ["structure and function", "growth and survival", "interaction within living systems"],
        application: "students understand how living things function, adapt, and remain connected to the environment"
      };
    }
  }

  if (subject === "History") {
    if (/revolution|national|rebel|raj|colonial|independence/.test(name)) {
      return {
        theme: "major historical change, resistance, and the making of modern societies",
        keyIdeas: ["causes and consequences", "people and movements", "historical interpretation"],
        application: "the chapter helps students see how ideas and struggles shaped society over time"
      };
    }
    if (/king|empire|sultan|mughal|kingdom|chronicle|capital/.test(name)) {
      return {
        theme: "political power, rule, and administration in the past",
        keyIdeas: ["rulers and institutions", "expansion and control", "records of the past"],
        application: "students learn that history is built from evidence, events, and changing forms of power"
      };
    }
    if (/book|burial|belief|building|painting|print|culture|tradition|traveller/.test(name)) {
      return {
        theme: "ideas, culture, and the ways people expressed belief and identity",
        keyIdeas: ["sources of history", "cultural change", "everyday life and expression"],
        application: "the reading encourages students to connect art, ideas, and social life with historical study"
      };
    }
    return {
      theme: "people, events, and change over time",
      keyIdeas: ["continuity and change", "sources and evidence", "causes and effects"],
      application: "historical study helps students understand how the present is connected with the past"
    };
  }

  if (subject === "Geography") {
    if (/earth|solar|globe|latitude|longitude|map|location/.test(name)) {
      return {
        theme: "the Earth as a place that can be observed, located, and represented",
        keyIdeas: ["location and direction", "maps and models", "spatial understanding"],
        application: "students learn to read the world carefully and connect places with patterns"
      };
    }
    if (/climate|water|drainage|air|ocean|vegetation|wildlife/.test(name)) {
      return {
        theme: "natural systems that shape the environment around us",
        keyIdeas: ["physical processes", "interaction in nature", "regional variation"],
        application: "this reading helps learners connect weather, land, water, and life in meaningful ways"
      };
    }
    if (/resource|agriculture|mineral|energy|industry|land|soil/.test(name)) {
      return {
        theme: "how humans use natural resources and organise economic life",
        keyIdeas: ["resource use", "distribution and management", "human dependence on nature"],
        application: "students begin to think about sustainability, production, and responsible use of resources"
      };
    }
    return {
      theme: "places, environments, and human interaction with them",
      keyIdeas: ["patterns across regions", "human-environment links", "observation and interpretation"],
      application: "geography helps students describe the world around them with clarity and connection"
    };
  }

  if (subject === "Civics" || subject === "Political Science") {
    if (/democracy|government|constitution|rights|federal|parliament|judiciary|executive|legislature|election|institution/.test(name)) {
      return {
        theme: "how democratic institutions and public systems work",
        keyIdeas: ["rules and institutions", "representation and participation", "rights and responsibilities"],
        application: "students connect textbook ideas with how public life and governance affect citizens"
      };
    }
    if (/equality|gender|religion|caste|marginal|social justice|citizenship|secular/.test(name)) {
      return {
        theme: "citizenship, fairness, and the social questions that shape public life",
        keyIdeas: ["inclusion and equality", "social identity", "justice in everyday life"],
        application: "the chapter helps learners think critically about respect, opportunity, and participation"
      };
    }
    return {
      theme: "public life, citizenship, and shared institutions",
      keyIdeas: ["participation", "responsibility", "democratic understanding"],
      application: "students learn how collective decisions and social values shape society"
    };
  }

  if (subject === "Economics") {
    if (/money|bank|credit|market|global|consumer/.test(name)) {
      return {
        theme: "how exchange, finance, and markets affect economic life",
        keyIdeas: ["decision making", "flow of money", "connections between producers and consumers"],
        application: "students relate the topic to saving, spending, trade, and everyday choices"
      };
    }
    if (/poverty|food|employment|human capital|resource|development|village|rural/.test(name)) {
      return {
        theme: "development, livelihoods, and the conditions that affect people’s economic well-being",
        keyIdeas: ["production and work", "opportunity and welfare", "economic challenges and policy"],
        application: "the reading encourages learners to connect economic ideas with real social conditions"
      };
    }
    return {
      theme: "how people produce, choose, and use resources",
      keyIdeas: ["scarcity and choice", "economic behaviour", "practical examples"],
      application: "economics helps students understand daily decisions and larger systems together"
    };
  }

  if (subject === "Business Studies") {
    return {
      theme: "how organisations are formed, managed, and guided toward goals",
      keyIdeas: ["business purpose", "decision making", "management and operations"],
      application: "students connect business concepts with real enterprises and workplace situations"
    };
  }

  if (subject === "Accountancy") {
    return {
      theme: "how financial information is recorded, organised, and interpreted",
      keyIdeas: ["accuracy and format", "financial records", "meaning behind transactions"],
      application: "accountancy helps students understand how financial information supports judgment and planning"
    };
  }

  return {
    theme: `the main ideas introduced in ${chapter}`,
    keyIdeas: ["core concepts", "important examples", "clear explanation"],
    application: "the topic builds understanding that will later support revision and assessment"
  };
};

const deriveFocusAreas = (subject, chapter) => {
  const base = [
    `Core ideas in ${chapter}`,
    `Examples and classroom applications in ${subject}`,
    `Revision points before the quiz`
  ];

  if (subject === "Mathematics") {
    return [`Definitions and patterns in ${chapter}`, "Worked examples", "Step-by-step problem solving"];
  }
  if (subject === "Science" || subject === "Physics" || subject === "Chemistry" || subject === "Biology") {
    return [`Key concepts from ${chapter}`, "Observation, reasoning, and explanation", "Important examples and everyday links"];
  }
  if (subject === "History" || subject === "Political Science" || subject === "Civics") {
    return [`Main ideas in ${chapter}`, "Important people, institutions, or events", "Cause, effect, and significance"];
  }
  if (subject === "Geography") {
    return [`Places, patterns, and processes in ${chapter}`, "Map and interpretation points", "Human and environmental links"];
  }
  if (subject === "Economics" || subject === "Business Studies" || subject === "Accountancy") {
    return [`Core terms in ${chapter}`, "Real-world applications", "Decision making and practice questions"];
  }

  return base;
};

const buildReadingBlocks = (grade, subject, chapter) => {
  const profile = subjectProfiles[subject] || subjectProfiles.Science;
  return [
    {
      title: "What to read first",
      text: `Start with the main idea of ${chapter}. In Class ${grade} ${subject}, this lesson is meant to build clear basics before you move to practice.`
    },
    {
      title: "How to study this chapter",
      text: `As you read, ${profile.verbs.join(", ")}. Make 3 to 5 short notes in your own words so the quiz feels easier later.`
    },
    {
      title: "Before the quiz",
      text: profile.quizTip
    }
  ];
};

const buildReadingPassages = (grade, subject, chapter) => {
  const details = inferConceptDetails(subject, chapter);
  const keyIdeas = joinTextList(details.keyIdeas);
  return [
    `${chapter} is a Class ${grade} ${subject} chapter that focuses on ${details.theme}. The chapter builds understanding through definitions, examples, and simple situations so that the learner can see the topic as a connected idea rather than as separate facts.`,
    `As the chapter develops, it brings attention to ${keyIdeas}. These ideas help the student understand how the topic works step by step and why each rule, example, or explanation is linked to the next one.`,
    `${details.application.charAt(0).toUpperCase()}${details.application.slice(1)}. After reading the chapter carefully, the student should be able to explain the main concept in simple words, recognise important terms, and attempt questions with clearer understanding.`
  ];
};

const buildChapter = (grade, subject, chapter, index) => {
  const focusAreas = deriveFocusAreas(subject, chapter);
  return {
    id: `${String(grade)}-${subject.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`,
    chapter,
    officialReference: `CBSE/NCERT aligned ${subject} structure for Class ${grade}`,
    overview: `This chapter covers ${chapter} as part of the Class ${grade} ${subject} learning path. Read it to understand the central ideas, note important examples, and prepare for the quiz that follows.`,
    learningGoals: [
      `Understand the main ideas from ${chapter}.`,
      `Build confidence in ${subject} through examples, explanation, and revision.`,
      `Prepare short notes that help you answer chapter-based quiz questions.`
    ],
    focusAreas,
    readingPassages: buildReadingPassages(grade, subject, chapter),
    readingBlocks: buildReadingBlocks(grade, subject, chapter)
  };
};

const buildSubject = (grade, subject, chapters) => {
  return {
    name: subject,
    officialSource: sources.ncertTextbooks,
    chapters: chapters.map((chapter, index) => buildChapter(grade, subject, chapter, index))
  };
};

const buildClassPayload = (grade, subjects) => {
  return {
    class: grade,
    board: "CBSE",
    basis: "Official CBSE curriculum with NCERT-aligned chapter and unit structure for supported subjects in this app.",
    generatedAt: new Date().toISOString(),
    sourceLinks: sources,
    subjects: Object.entries(subjects).map(([subject, chapters]) =>
      buildSubject(grade, subject, chapters)
    )
  };
};

fs.mkdirSync(CONTENT_DIR, { recursive: true });

for (const [grade, subjects] of Object.entries(syllabusMap)) {
  const payload = buildClassPayload(grade, subjects);
  const filePath = path.join(CONTENT_DIR, `class${grade}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

console.log("Official-aligned content JSON rebuilt for classes 6 to 12.");
