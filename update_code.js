const fs = require('fs');

// 1. Cập nhật CourseStatsTab.tsx
let statsTab = fs.readFileSync('components/course/CourseStatsTab.tsx', 'utf8');

// Cập nhật totalMembers và việc sử dụng countedMembers thay vì members
statsTab = statsTab.replace(
    /const totalMembers = members\.length\s+const teamsWithPS = new Set\(members\.filter\(m => m\.memberRole === 'PS'\)\.map\(m => m\.team\)\)/,
    `const teamsWithPS = new Set(members.filter(m => m.memberRole === 'PS').map(m => m.team))`
);

statsTab = statsTab.replace(
    /const countedMembers = members\.filter\(isCounted\)\s+const avgPercent = average\(countedMembers\.map\(m => m\.completionPercent\)\.filter\(\(p\): p is number => p !== null\)\)/,
    `const countedMembers = members.filter(isCounted)\n    const totalMembers = countedMembers.length\n    const avgPercent = average(countedMembers.map(m => m.completionPercent).filter((p): p is number => p !== null))`
);

// Sửa teamStats map để dùng countedMembers
statsTab = statsTab.replace(
    /members\.forEach\(m => {/g,
    `countedMembers.forEach(m => {`
);

// Sắp xếp lessons.map
statsTab = statsTab.replace(
    /const dayStats = lessons\.map\(l => {/g,
    `const dayStats = [...lessons].reverse().map(l => {`
);

fs.writeFileSync('components/course/CourseStatsTab.tsx', statsTab);


// 2. Cập nhật CourseActivityFeedTab.tsx
let feedTab = fs.readFileSync('components/course/CourseActivityFeedTab.tsx', 'utf8');

// Avatar styling
feedTab = feedTab.replace(
    /function Avatar.*?return \(/s,
    `function Avatar({ src, name }: { src: string | null; name: string | null }) {\n    if (src) {\n        return <Image src={src} alt={name || 'Avatar'} width={36} height={36} className="rounded-full object-cover shrink-0" />\n    }\n    return (`
);

feedTab = feedTab.replace(
    /<Avatar src=\{item\.userImage\} name=\{item\.userName\} \/>/,
    `<div className="shrink-0 self-start">\n                <Avatar src={item.userImage} name={item.userName} />\n            </div>`
);

// Lọc 3 ngày gần nhất
feedTab = feedTab.replace(
    /if \(res\.success\) setFeed\(\(res\.feed as FeedItem\[\]\) \|\| \[\]\)/,
    `if (res.success) {\n                const feedData = (res.feed as FeedItem[]) || []\n                const nowTime = new Date().getTime()\n                const recentFeed = feedData.filter(item => {\n                    const diffDays = (nowTime - new Date(item.createdAt).getTime()) / (1000 * 3600 * 24)\n                    return diffDays <= 3\n                })\n                setFeed(recentFeed)\n            }`
);

fs.writeFileSync('components/course/CourseActivityFeedTab.tsx', feedTab);


// 3. Cập nhật MemberRosterPanel.tsx
let rosterTab = fs.readFileSync('components/course/MemberRosterPanel.tsx', 'utf8');

rosterTab = rosterTab.replace(
    /const handleExportImage = \(\) => {\s+if \(members\.length === 0\) return\s+setExportingImage\(true\)\s+try {\s+const sorted = \[\.\.\.members\]\.sort/,
    `const handleExportImage = () => {\n        if (members.length === 0) return\n        setExportingImage(true)\n        try {\n            const teamsWithPS = new Set(members.filter(m => m.memberRole === 'PS').map(m => m.team))\n            const countedMembers = members.filter(m => {\n                if (!teamsWithPS.has(m.team)) return false\n                if (m.memberRole === 'PS') return true\n                return groupLabel(m.team, m.group, labels) !== 'Tạm dừng/có lý do'\n            })\n            const sorted = [...countedMembers].sort`
);

fs.writeFileSync('components/course/MemberRosterPanel.tsx', rosterTab);

console.log('Done script');
