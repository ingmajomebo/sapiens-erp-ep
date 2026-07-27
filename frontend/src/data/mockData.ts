export const products = [
  { id: '1', name: 'Atlantic Salmon', initial: 'AS', sku: 'FF-1001', category: 'Fresh fish', wh: 'Cold Storage A', lot: 'L-2024-001', expDate: '2026-06-23', expSoon: true, onhand: '142.5 kg', cost: '€18.50/kg', value: '€2,636.25', status: 'ok', tile: 'teal' },
  { id: '2', name: 'Tiger Prawns', initial: 'TP', sku: 'FF-1002', category: 'Shellfish', wh: 'Cold Storage A', lot: 'L-2024-002', expDate: '2026-06-24', expSoon: true, onhand: '45.0 kg', cost: '€32.00/kg', value: '€1,440.00', status: 'low', tile: 'orange' },
  { id: '3', name: 'Sea Bass', initial: 'SB', sku: 'FF-1003', category: 'Fresh fish', wh: 'Display Counter', lot: 'L-2024-003', expDate: '2026-06-22', expSoon: true, onhand: '38.0 kg', cost: '€22.00/kg', value: '€836.00', status: 'critical', tile: 'blue' },
  { id: '4', name: 'Octopus', initial: 'OC', sku: 'FF-1004', category: 'Shellfish', wh: 'Cold Storage A', lot: 'L-2024-004', expDate: '2026-06-28', expSoon: false, onhand: '28.5 kg', cost: '€16.00/kg', value: '€456.00', status: 'ok', tile: 'purple' },
  { id: '5', name: 'Cod Fillet', initial: 'CF', sku: 'FF-1005', category: 'Fresh fish', wh: 'Cold Storage A', lot: 'L-2024-005', expDate: '2026-06-25', expSoon: false, onhand: '95.0 kg', cost: '€12.50/kg', value: '€1,187.50', status: 'ok', tile: 'teal' },
  { id: '6', name: 'King Crab', initial: 'KC', sku: 'FF-1006', category: 'Shellfish', wh: 'Freezer B', lot: 'L-2024-006', expDate: '2026-09-15', expSoon: false, onhand: '12.0 kg', cost: '€85.00/kg', value: '€1,020.00', status: 'low', tile: 'red' },
  { id: '7', name: 'Bluefin Tuna', initial: 'BT', sku: 'FF-1007', category: 'Fresh fish', wh: 'Cold Storage A', lot: 'L-2024-007', expDate: '2026-06-23', expSoon: true, onhand: '56.0 kg', cost: '€45.00/kg', value: '€2,520.00', status: 'ok', tile: 'blue' },
  { id: '8', name: 'Oysters', initial: 'OY', sku: 'FF-1008', category: 'Shellfish', wh: 'Display Counter', lot: 'L-2024-008', expDate: '2026-06-22', expSoon: true, onhand: '200 units', cost: '€1.20/u', value: '€240.00', status: 'ok', tile: 'green' },
  { id: '9', name: 'Smoked Salmon', initial: 'SS', sku: 'FF-1009', category: 'Smoked', wh: 'Cold Storage A', lot: 'L-2024-009', expDate: '2026-07-15', expSoon: false, onhand: '30.0 kg', cost: '€38.00/kg', value: '€1,140.00', status: 'ok', tile: 'orange' },
  { id: '10', name: 'Langoustines', initial: 'LG', sku: 'FF-1010', category: 'Shellfish', wh: 'Freezer B', lot: 'L-2024-010', expDate: '2026-08-20', expSoon: false, onhand: '25.0 kg', cost: '€55.00/kg', value: '€1,375.00', status: 'ok', tile: 'purple' },
  { id: '11', name: 'Sea Bream', initial: 'SBr', sku: 'FF-1011', category: 'Fresh fish', wh: 'Display Counter', lot: 'L-2024-011', expDate: '2026-06-23', expSoon: true, onhand: '18.0 kg', cost: '€14.00/kg', value: '€252.00', status: 'low', tile: 'teal' },
  { id: '12', name: 'Squid', initial: 'SQ', sku: 'FF-1012', category: 'Shellfish', wh: 'Cold Storage A', lot: 'L-2024-012', expDate: '2026-06-27', expSoon: false, onhand: '42.0 kg', cost: '€9.50/kg', value: '€399.00', status: 'ok', tile: 'blue' },
]

export const purchaseOrders = [
  { id: 'PO-2026-041', sup: 'Costera Seafood S.A.', date: '2026-06-19', items: 6, total: '€4,820.00', exp: '2026-06-21', status: 'pending' },
  { id: 'PO-2026-040', sup: 'Atlántico Pesca', date: '2026-06-18', items: 4, total: '€3,240.00', exp: '2026-06-20', status: 'received' },
  { id: 'PO-2026-039', sup: 'Mariscos del Norte', date: '2026-06-17', items: 3, total: '€2,600.00', exp: '2026-06-19', status: 'received' },
  { id: 'PO-2026-038', sup: 'Costera Seafood S.A.', date: '2026-06-15', items: 5, total: '€5,510.00', exp: '2026-06-17', status: 'received' },
  { id: 'PO-2026-037', sup: 'Atlántico Pesca', date: '2026-06-14', items: 2, total: '€1,850.00', exp: '2026-06-16', status: 'cancelled' },
  { id: 'PO-2026-036', sup: 'Neptune Imports', date: '2026-06-13', items: 8, total: '€3,900.00', exp: '2026-06-15', status: 'received' },
]

export const salesOrders = [
  { id: 'SO-2026-142', cust: 'Restaurant Mar y Sol', date: '2026-06-21', items: 4, total: '€840.00', pay: 'Transfer', status: 'confirmed' },
  { id: 'SO-2026-141', cust: 'Hotel Playa Grande', date: '2026-06-21', items: 7, total: '€1,620.00', pay: 'Transfer', status: 'delivered' },
  { id: 'SO-2026-140', cust: 'Walk-in', date: '2026-06-21', items: 2, total: '€156.00', pay: 'Cash', status: 'delivered' },
  { id: 'SO-2026-139', cust: 'Bistro Neptuno', date: '2026-06-20', items: 5, total: '€720.00', pay: 'Card', status: 'delivered' },
  { id: 'SO-2026-138', cust: 'Marisquería Central', date: '2026-06-20', items: 3, total: '€480.00', pay: 'Transfer', status: 'pending' },
  { id: 'SO-2026-137', cust: 'Restaurant Mar y Sol', date: '2026-06-19', items: 6, total: '€990.00', pay: 'Transfer', status: 'delivered' },
]

export const cashMovements = [
  { time: '14:32', type: 'Venta',    ref: 'SO-2026-142',   method: 'Efectivo',       amount: '$ 840.000',   pos: true },
  { time: '13:18', type: 'Venta',    ref: 'SO-2026-141',   method: 'Tarjeta',         amount: '$ 156.000',   pos: true },
  { time: '11:45', type: 'Gasto',    ref: 'EXP-2026-088',  method: 'Efectivo',       amount: '−$ 180.000',  pos: false },
  { time: '10:20', type: 'Venta',    ref: 'SO-2026-139',   method: 'Efectivo',       amount: '$ 720.000',   pos: true },
  { time: '09:05', type: 'Venta',    ref: 'SO-2026-138',   method: 'Transferencia',  amount: '$ 480.000',   pos: true },
  { time: '07:30', type: 'Apertura', ref: 'CS-2026-156',   method: '—',              amount: '$ 300.000',   pos: true },
]

export const invoices = [
  { id: 'INV-2026-089', cust: 'Hotel Playa Grande', so: 'SO-2026-141', issue: '2026-06-21', due: '2026-07-21', total: '€1,620.00', paid: '€0.00', balance: '€1,620.00', status: 'issued' },
  { id: 'INV-2026-088', cust: 'Restaurant Mar y Sol', so: 'SO-2026-137', issue: '2026-06-19', due: '2026-07-19', total: '€990.00', paid: '€990.00', balance: '€0.00', status: 'paid' },
  { id: 'INV-2026-087', cust: 'Bistro Neptuno', so: 'SO-2026-139', issue: '2026-06-20', due: '2026-06-30', total: '€720.00', paid: '€360.00', balance: '€360.00', status: 'partial' },
  { id: 'INV-2026-086', cust: 'Marisquería Central', so: 'SO-2026-135', issue: '2026-06-10', due: '2026-06-20', total: '€1,240.00', paid: '€0.00', balance: '€1,240.00', status: 'overdue' },
  { id: 'INV-2026-085', cust: 'Catering Azul', so: 'SO-2026-132', issue: '2026-06-08', due: '2026-06-18', total: '€2,000.00', paid: '€0.00', balance: '€2,000.00', status: 'overdue' },
  { id: 'INV-2026-084', cust: 'Walk-in', so: 'SO-2026-140', issue: '2026-06-21', due: '2026-06-21', total: '€156.00', paid: '€156.00', balance: '€0.00', status: 'paid' },
  { id: 'INV-2026-083', cust: 'Hotel Playa Grande', so: '—', issue: '—', due: '—', total: '€1,500.00', paid: '€0.00', balance: '€1,500.00', status: 'draft' },
]

export const expenses = [
  { date: '2026-06-21', cat: 'Logistics', initial: 'L', desc: 'Cold chain delivery', vendor: 'TransFrio S.L.', method: 'Transfer', amount: '€320.00', status: 'paid' },
  { date: '2026-06-20', cat: 'Payroll', initial: 'P', desc: 'Staff June week 3', vendor: 'Internal', method: 'Transfer', amount: '€1,800.00', status: 'paid' },
  { date: '2026-06-20', cat: 'Supplies', initial: 'S', desc: 'Packaging & ice', vendor: 'Empaques Norte', method: 'Cash', amount: '€145.00', status: 'paid' },
  { date: '2026-06-19', cat: 'Utilities', initial: 'U', desc: 'Electricity June', vendor: 'Endesa', method: 'Direct debit', amount: '€380.00', status: 'pending' },
  { date: '2026-06-19', cat: 'Maintenance', initial: 'M', desc: 'Cold room service', vendor: 'FrigoCare', method: 'Transfer', amount: '€560.00', status: 'pending' },
  { date: '2026-06-18', cat: 'Rent', initial: 'R', desc: 'Premises June', vendor: 'Inmobiliaria Mar', method: 'Direct debit', amount: '€1,500.00', status: 'paid' },
  { date: '2026-06-17', cat: 'Other', initial: 'O', desc: 'Misc office supplies', vendor: 'Staples', method: 'Cash', amount: '€86.50', status: 'draft' },
]

export const topProducts = [
  { name: 'Atlantic Salmon', qty: '142.5 kg', amount: '€3,705.00', tile: 'teal', initial: 'AS' },
  { name: 'Bluefin Tuna', qty: '56.0 kg', amount: '€2,800.00', tile: 'blue', initial: 'BT' },
  { name: 'Tiger Prawns', qty: '45.0 kg', amount: '€1,440.00', tile: 'orange', initial: 'TP' },
  { name: 'Langoustines', qty: '25.0 kg', amount: '€1,375.00', tile: 'purple', initial: 'LG' },
  { name: 'Smoked Salmon', qty: '30.0 kg', amount: '€1,140.00', tile: 'orange', initial: 'SS' },
]

export const lowStockItems = [
  { name: 'Tiger Prawns', wh: 'Cold Storage A', qty: '45.0 kg' },
  { name: 'King Crab', wh: 'Freezer B', qty: '12.0 kg' },
  { name: 'Sea Bream', wh: 'Display Counter', qty: '18.0 kg' },
  { name: 'Sea Bass', wh: 'Display Counter', qty: '38.0 kg' },
]

export const expiringItems = [
  { name: 'Sea Bass', lot: 'L-2024-003', qty: '38.0 kg', urgency: 'today' },
  { name: 'Oysters', lot: 'L-2024-008', qty: '200 units', urgency: 'today' },
  { name: 'Atlantic Salmon', lot: 'L-2024-001', qty: '142.5 kg', urgency: 'tomorrow' },
  { name: 'Bluefin Tuna', lot: 'L-2024-007', qty: '56.0 kg', urgency: 'tomorrow' },
]

export const recentSales = [
  { id: 'SO-2026-142', cust: 'Restaurant Mar y Sol', total: '€840.00', status: 'confirmed' },
  { id: 'SO-2026-141', cust: 'Hotel Playa Grande', total: '€1,620.00', status: 'delivered' },
  { id: 'SO-2026-140', cust: 'Walk-in', total: '€156.00', status: 'delivered' },
  { id: 'SO-2026-139', cust: 'Bistro Neptuno', total: '€720.00', status: 'delivered' },
]

export const recentPurchases = [
  { id: 'PO-2026-041', sup: 'Costera Seafood S.A.', total: '€4,820.00', status: 'pending' },
  { id: 'PO-2026-040', sup: 'Atlántico Pesca', total: '€3,240.00', status: 'received' },
  { id: 'PO-2026-039', sup: 'Mariscos del Norte', total: '€2,600.00', status: 'received' },
  { id: 'PO-2026-038', sup: 'Costera Seafood S.A.', total: '€5,510.00', status: 'received' },
]

export const accountingMovements = [
  { date: '2026-06-21', ref: 'INV-2026-089', description: 'Invoice Hotel Playa Grande', account: 'Accounts Receivable', type: 'debit', amount: '€1,620.00' },
  { date: '2026-06-21', ref: 'SO-2026-142', description: 'Sale Restaurant Mar y Sol', account: 'Revenue', type: 'credit', amount: '€840.00' },
  { date: '2026-06-21', ref: 'EXP-2026-088', description: 'Cold chain delivery', account: 'Logistics Expenses', type: 'debit', amount: '€320.00' },
  { date: '2026-06-20', ref: 'PO-2026-040', description: 'Purchase Atlántico Pesca', account: 'Accounts Payable', type: 'credit', amount: '€3,240.00' },
  { date: '2026-06-20', ref: 'EXP-2026-087', description: 'Staff payroll week 3', account: 'Payroll Expenses', type: 'debit', amount: '€1,800.00' },
]

export const arItems = [
  { customer: 'Hotel Playa Grande', invoice: 'INV-2026-089', amount: '€1,620.00', age: '0 days', status: 'issued' },
  { customer: 'Bistro Neptuno', invoice: 'INV-2026-087', amount: '€360.00', age: '1 day', status: 'partial' },
  { customer: 'Marisquería Central', invoice: 'INV-2026-086', amount: '€1,240.00', age: '11 days', status: 'overdue' },
  { customer: 'Catering Azul', invoice: 'INV-2026-085', amount: '€2,000.00', age: '13 days', status: 'overdue' },
]

export const apItems = [
  { vendor: 'Costera Seafood S.A.', po: 'PO-2026-041', amount: '€4,820.00', age: '2 days', status: 'pending' },
  { vendor: 'Atlántico Pesca', po: 'PO-2026-036', amount: '€3,240.00', age: '3 days', status: 'pending' },
  { vendor: 'TransFrio S.L.', po: 'EXP-2026-088', amount: '€320.00', age: '0 days', status: 'pending' },
]
