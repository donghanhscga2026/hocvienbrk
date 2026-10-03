const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Đọc hàm lọc thật; dữ liệu mẫu không ghi vào database.
const source = fs.readFileSync(path.join(__dirname, '../lib/course-catalog.ts'), 'utf8')
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
const context = {exports:{}, Date}
vm.runInNewContext(compiled, context)
const {filterCatalog,EMPTY_CATALOG_FILTERS,normalizeCatalogText} = context.exports
const course = (id, price, extra={}) => ({id,id_khoa:'KH'+id,name_lop:'Khóa '+id,phi_coc:price,feeType:price ? 'PHI_CAM_KET':'MIEN_PHI',createdAt:'2026-10-01',...extra})
const courses = [
  course(1,0,{name_lop:'Thiết kế website',courseCategory:{id:1,name:'Công nghệ'},teacher:{id:10,name:'Hương Lucy'}}),
  course(2,499999,{name_lop:'Đào tạo AI',category:'Công nghệ',teacher:{id:20,name:'Thầy Cường'}}),
  course(3,500000,{category:'Kinh doanh',teacher:{id:20,name:'Thầy Cường'}}),
  course(4,1000000,{category:'Kinh doanh',feeType:'PHI_TOI_THIEU'}),
  course(5,1000001,{updatedAt:'2026-10-03',feeType:'PHI_DONG_HANH'}),
  course(6,0,{feeType:'PHI_TUY_TINH',createdAt:null}),
]
const enrollments = {1:{status:'ACTIVE'},2:{status:'PENDING'},3:{status:'COMPLETED'}}
let checks=0
function check(filters,expected,message) {
  assert.deepEqual(Array.from(filterCatalog(courses,enrollments,{...EMPTY_CATALOG_FILTERS,...filters}),c=>c.id),expected,message)
  checks++
}
check({},[5,1,2,3,4,6],'Default includes enrolled and featured source courses')
check({query:'huong' },[1],'Teacher search ignores Vietnamese accents')
check({query:'dao tao'},[2],'Search handles đ and accents')
check({query:'AI cuong'},[2],'Every search term must match course or teacher')
check({query:'KH3'},[3],'Course code can be searched')
check({category:'Công nghệ'},[1,2],'Old and relational categories share a facet')
check({teacher:'20'},[2,3],'Teacher filter uses ID')
check({teacher:'999'},[],'Filtering cannot add courses outside the provided scope')
check({price:'free'},[1,6],'Zero required fee can include optional contribution')
check({price:'under500'},[1,2,6],'Under 500k includes zero and excludes 500k')
check({price:'to1m'},[3,4],'Inclusive 500k and 1m boundaries')
check({price:'over1m'},[5],'Over 1m excludes exact 1m')
check({fee:'PHI_TUY_TINH'},[6],'Fee type is independent from required amount')
check({status:'active'},[1],'Only current user active enrollment')
check({status:'pending'},[2],'Pending activation remains separate')
check({status:'completed'},[3],'Completed enrollment remains searchable')
check({status:'new'},[5,4,6],'New excludes active, pending and completed')
check({teacher:'20',category:'Công nghệ',price:'under500'},[2],'Filters intersect')
check({query:'not found'},[],'No matching result')
check({sort:'price-asc'},[1,6,2,3,4,5],'Ascending fee uses stable ID tie-break')
check({sort:'price-desc'},[5,4,3,2,1,6],'Descending fee uses stable ID tie-break')
assert.equal(courses[0].id,1,'Filtering does not mutate input order');checks++
assert.equal(normalizeCatalogText('  ĐÀO TẠO  '),'dao tao');checks++
console.log(JSON.stringify({result:'passed',checks,scope:'real catalog filter; fixtures only; no network or database'}))
