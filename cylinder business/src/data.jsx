// ============ Cylinder Admin — mock data ============
// English UI, Western numerals, Taka (৳)

const TK = (n) => '৳' + Number(n).toLocaleString('en-US');

// Cylinder type master. cyl color pair drives the .cyl-ava gradient.
const CYLINDERS = [
  { id: 'lpg12',  name: 'LP Gas',        size: '12 kg', status: 'Active',   brands: 'Bashundhara, Omera', short: '12', c1: '#2BB3C0', c2: '#0E7B86' },
  { id: 'lpg35',  name: 'LP Gas',        size: '35 kg', status: 'Active',   brands: 'Omera, Jamuna',      short: '35', c1: '#5A8DEE', c2: '#2C5FB8' },
  { id: 'petro',  name: 'Petromax',      size: 'Small', status: 'Active',   brands: 'Local refill',       short: 'PX', c1: '#FF8A5B', c2: '#D2541C' },
  { id: 'ind45',  name: 'Industrial Gas',size: '45 kg', status: 'Inactive', brands: 'Factory supply',     short: '45', c1: '#9AA3AE', c2: '#5B636E' },
];

// FIFO lots for the focused product (Petromax) — matches the doc example
const LOTS = [
  { id: 'L-001', cyl: 'petro', date: 'Jan 1',  cost: 100, qty: 20, sold: 20, status: 'Done'    },
  { id: 'L-002', cyl: 'petro', date: 'Jan 5',  cost: 80,  qty: 15, sold: 8,  status: 'Active'  },
  { id: 'L-003', cyl: 'petro', date: 'Jan 9',  cost: 150, qty: 10, sold: 0,  status: 'Pending' },
];

// Recent purchase lots across products (for purchase table)
const PURCHASES = [
  { id: 'L-014', date: 'May 30', cyl: 'lpg12', supplier: 'Omera Petroleum', qty: 60, cost: 1180, total: 70800, paid: 50000, due: 20800, status: 'Active'  },
  { id: 'L-013', date: 'May 28', cyl: 'lpg35', supplier: 'Jamuna Dealer',   qty: 25, cost: 3050, total: 76250, paid: 76250, due: 0,     status: 'Active'  },
  { id: 'L-012', date: 'May 27', cyl: 'petro', supplier: 'Self',            qty: 10, cost: 150,  total: 1500,  paid: 1500,  due: 0,     status: 'Pending' },
  { id: 'L-011', date: 'May 25', cyl: 'lpg12', supplier: 'Bashundhara LP',  qty: 80, cost: 1165, total: 93200, paid: 93200, due: 0,     status: 'Done'    },
  { id: 'L-010', date: 'May 22', cyl: 'petro', supplier: 'Self',            qty: 15, cost: 80,   total: 1200,  paid: 800,   due: 400,   status: 'Active'  },
];

// real-time stock — filled & empty per type
const STOCK = [
  { cyl: 'lpg12', filled: 142, empty: 88,  cap: 200, reorder: 40 },
  { cyl: 'lpg35', filled: 34,  empty: 19,  cap: 80,  reorder: 20 },
  { cyl: 'petro', filled: 17,  empty: 41,  cap: 60,  reorder: 15 },
  { cyl: 'ind45', filled: 6,   empty: 4,   cap: 30,  reorder: 10 },
];

const SUPPLIERS = [
  { id: 's1', name: 'Omera Petroleum', type: 'Dealer/Agent', due: 20800 },
  { id: 's2', name: 'Bashundhara LP',  type: 'Dealer/Agent', due: 0 },
  { id: 's3', name: 'Jamuna Dealer',   type: 'Dealer/Agent', due: 0 },
  { id: 's4', name: 'Self',            type: 'Self',         due: 400 },
];

const SALESMEN = [
  { id: 'm1', name: 'Karim Uddin',   phone: '01711-203040', avatar: 'KU',
    allocated: [ {cyl:'lpg12', qty: 18}, {cyl:'petro', qty: 6} ],
    soldToday: 11, returned: 0, collected: 9400, color: '#FF6B6B' },
  { id: 'm2', name: 'Rafiq Hossain', phone: '01822-556677', avatar: 'RH',
    allocated: [ {cyl:'lpg12', qty: 12}, {cyl:'lpg35', qty: 4} ],
    soldToday: 7,  returned: 2, collected: 15200, color: '#6B47C0' },
  { id: 'm3', name: 'Jamal Mia',     phone: '01933-889900', avatar: 'JM',
    allocated: [ {cyl:'petro', qty: 8} ],
    soldToday: 3,  returned: 1, collected: 1100, color: '#1D6FD1' },
];

// dashboard recent sales feed
const RECENT_SALES = [
  { time: '2:14 PM', cyl: 'lpg12', qty: 2, price: 1450, customer: 'Hotel Sonar Bangla', pay: 'Cash',    by: 'Karim Uddin' },
  { time: '1:02 PM', cyl: 'petro', qty: 4, price: 200,  customer: 'Rahela Store',        pay: 'Due',     by: 'Jamal Mia' },
  { time: '12:30 PM',cyl: 'lpg35', qty: 1, price: 3400, customer: 'Padma Restaurant',    pay: 'Partial', by: 'Rafiq Hossain' },
  { time: '11:48 AM',cyl: 'lpg12', qty: 3, price: 1450, customer: 'Walk-in',             pay: 'Cash',    by: 'Admin' },
  { time: '10:15 AM',cyl: 'petro', qty: 2, price: 210,  customer: 'Nodi General Store',  pay: 'Cash',    by: 'Karim Uddin' },
];

// weekly sales for chart (qty, ৳)
const WEEK = [
  { d: 'Mon', amt: 38200 }, { d: 'Tue', amt: 41600 }, { d: 'Wed', amt: 29800 },
  { d: 'Thu', amt: 52400 }, { d: 'Fri', amt: 47100 }, { d: 'Sat', amt: 61300 }, { d: 'Sun', amt: 44900 },
];

const cylById = (id) => CYLINDERS.find(c => c.id === id);

Object.assign(window, {
  TK, CYLINDERS, LOTS, PURCHASES, STOCK, SUPPLIERS, SALESMEN,
  RECENT_SALES, WEEK, cylById,
});
