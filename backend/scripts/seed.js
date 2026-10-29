// Seeds 10 categories x 50 books = 500 DEMO records.  Usage: npm run seed   (or npm run seed:reset to rebuild)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Category = require('../models/Category');
const Book = require('../models/Book');
const User = require('../models/User');

const CATS = [
  ['Computer Science and IT', 'CS', ['Data Structures', 'Algorithms', 'Operating Systems', 'Database Systems', 'Computer Networks', 'Software Engineering', 'Compiler Design', 'Computer Architecture', 'Web Technologies', 'Cyber Security']],
  ['Artificial Intelligence and Machine Learning', 'AI', ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning', 'Knowledge Representation', 'Probabilistic Models', 'Robotics and AI', 'Pattern Recognition']],
  ['Data Science and Big Data', 'DS', ['Data Analytics', 'Statistical Learning', 'Big Data Systems', 'Data Mining', 'Data Visualization', 'Hadoop and Spark', 'Data Warehousing', 'Time Series Analysis', 'Cloud Data Engineering', 'Text Analytics']],
  ['Electronics and Communication Engineering', 'EC', ['Digital Electronics', 'Analog Circuits', 'Signals and Systems', 'Communication Systems', 'VLSI Design', 'Microprocessors', 'Embedded Systems', 'Antenna Theory', 'Digital Signal Processing', 'Control Systems']],
  ['Electrical Engineering', 'EE', ['Circuit Theory', 'Electrical Machines', 'Power Systems', 'Power Electronics', 'Electromagnetic Fields', 'High Voltage Engineering', 'Electrical Measurements', 'Renewable Energy Systems', 'Switchgear and Protection', 'Electric Drives']],
  ['Mechanical Engineering', 'ME', ['Thermodynamics', 'Fluid Mechanics', 'Strength of Materials', 'Machine Design', 'Heat Transfer', 'Manufacturing Processes', 'Theory of Machines', 'Engineering Mechanics', 'Mechatronics', 'Automobile Engineering']],
  ['Civil Engineering', 'CE', ['Structural Analysis', 'Concrete Technology', 'Geotechnical Engineering', 'Surveying', 'Transportation Engineering', 'Environmental Engineering', 'Hydrology', 'Construction Management', 'Steel Structures', 'Building Materials']],
  ['Mathematics and Statistics', 'MS', ['Calculus', 'Linear Algebra', 'Discrete Mathematics', 'Probability Theory', 'Differential Equations', 'Numerical Methods', 'Real Analysis', 'Statistical Inference', 'Complex Analysis', 'Operations Research']],
  ['Physics and Chemistry', 'PC', ['Classical Mechanics', 'Quantum Physics', 'Optics', 'Thermal Physics', 'Solid State Physics', 'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Engineering Chemistry']],
  ['Business Administration and Management', 'BA', ['Principles of Management', 'Marketing Management', 'Financial Management', 'Human Resource Management', 'Operations Management', 'Business Analytics', 'Entrepreneurship', 'Organizational Behaviour', 'Business Law', 'Strategic Management']],
];
const VARIANTS = ['Fundamentals', 'Advanced Concepts', 'Problems and Solutions', 'Laboratory Manual', 'Study Guide'];
const AUTHORS = ['A. Raman', 'S. Iyer', 'P. Nair', 'K. Menon', 'R. Sharma', 'M. Banerjee', 'L. Fernandes', 'D. Kulkarni', 'T. Varghese', 'N. Gupta', 'V. Subramanian', 'H. Khan', 'J. Mathew', 'B. Reddy', 'C. Pillai'];
const PUBS = ['UniLib Demo Press', 'Sample Academic Publishing', 'Campus Reference Books (demo)'];

(async () => {
  await connectDB();
  if (process.argv.includes('--reset')) { await Book.deleteMany({ isDemo: true }); console.log('Removed old demo books.'); }

  let created = 0;
  for (const [name, code, topics] of CATS) {
    const cat = await Category.findOneAndUpdate({ code }, { name, code, description: `Demo shelf section for ${name}.` }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const docs = [];
    let n = 0;
    for (const topic of topics) {
      for (const v of VARIANTS) {
        n += 1;
        const total = 2 + ((n * 7) % 5);
        docs.push({
          bookId: `UL-${code}-${String(n).padStart(3, '0')}`,
          isbn: `DEMO-${code}-${String(n).padStart(4, '0')}`,
          title: `${topic}: ${v}`,
          author: `${AUTHORS[(n + code.charCodeAt(0)) % AUTHORS.length]} (sample)`,
          category: cat._id,
          publisher: PUBS[n % PUBS.length],
          year: 2008 + ((n * 3) % 17),
          description: `DEMO RECORD. Sample entry for the ${topic.toLowerCase()} shelf, created for the UniLib academic project. Not a verified publication.`,
          totalCopies: total, availableCopies: total,
          shelf: `${code}-R${Math.ceil(n / 10)}-L${((n - 1) % 5) + 1}`,
          isDemo: true,
        });
      }
    }
    const existing = new Set((await Book.find({ bookId: { $in: docs.map((d) => d.bookId) } }).select('bookId')).map((b) => b.bookId));
    const fresh = docs.filter((d) => !existing.has(d.bookId));
    if (fresh.length) { await Book.insertMany(fresh); created += fresh.length; }
  }
  console.log(`Seed complete: ${created} new demo books (${await Book.countDocuments()} total).`);

  if (process.argv.includes('--demo-student')) {
    if (!(await User.exists({ email: 'demo.student@unilib.test' }))) {
      await User.create({ name: 'Demo Student', studentId: 'DEMO001', department: 'Computer Science', year: 2, email: 'demo.student@unilib.test', phone: '9876543210', password: await bcrypt.hash('Student@123', 12), role: 'student' });
      console.log('Demo student created: demo.student@unilib.test / Student@123  (demo only, delete before real use)');
    }
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
