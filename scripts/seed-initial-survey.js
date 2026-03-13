
const { PrismaClient } = require('@prisma/client');
const { surveyQuestions } = require('../lib/survey-data');

const prisma = new PrismaClient();

async function seedInitialSurvey() {
  console.log('🚀 Bắt đầu chuyển đổi dữ liệu khảo sát tĩnh sang Database...');

  const nodes = [];
  const edges = [];
  
  let x = 100;
  let y = 100;
  const spacingX = 450;
  const spacingY = 200;

  const questions = surveyQuestions;
  const questionKeys = Object.keys(questions);

  questionKeys.forEach((qId, qIndex) => {
    const q = questions[qId];
    
    // 1. Tạo Node Câu hỏi
    nodes.push({
      id: qId,
      type: 'questionNode',
      position: { x: x + qIndex * spacingX, y: y },
      data: { label: q.question, type: q.type }
    });

    // 2. Tạo các Node Đáp án và nối dây
    if (Array.isArray(q.options)) {
      q.options.forEach((opt, optIndex) => {
        const optionNodeId = `opt_${qId}_${opt.id}`;
        
        // Node Đáp án
        nodes.push({
          id: optionNodeId,
          type: 'optionNode',
          position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY },
          data: { label: opt.label }
        });

        // Dây nối: Câu hỏi -> Đáp án
        edges.push({
          id: `e_${qId}_${optionNodeId}`,
          source: qId,
          target: optionNodeId
        });

        // Nếu có rẽ nhánh tiếp theo (nextQuestionId)
        if (opt.nextQuestionId && opt.nextQuestionId !== 'done') {
            // Dây nối: Đáp án -> Câu hỏi tiếp theo
            edges.push({
              id: `e_${optionNodeId}_${opt.nextQuestionId}`,
              source: optionNodeId,
              target: opt.nextQuestionId
            });
        }
        
        // Nếu là tư vấn (isAdvice)
        if (opt.isAdvice) {
            const adviceNodeId = `advice_${qId}_${opt.id}`;
            nodes.push({
                id: adviceNodeId,
                type: 'adviceNode',
                position: { x: x + qIndex * spacingX + (optIndex * 180 - 150), y: y + spacingY * 2 },
                data: { label: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
            });
            edges.push({
                id: `e_${optionNodeId}_${adviceNodeId}`,
                source: optionNodeId,
                target: adviceNodeId
            });
        }
      });
    }
  });

  try {
    // Lưu vào Database bài khảo sát đầu tiên
    const survey = await prisma.survey.create({
      data: {
        name: 'Lộ trình Zero 2 Hero (Bản gốc)',
        description: 'Bài khảo sát mặc định được chuyển đổi từ mã nguồn tĩnh.',
        flow: { nodes, edges },
        isActive: true
      }
    });

    console.log(`✅ Thành công! Đã tạo bài khảo sát với ID: ${survey.id}`);
    console.log('💡 Bây giờ học viên sẽ thực hiện khảo sát dựa trên dữ liệu trong Database.');
  } catch (error) {
    console.error('❌ Lỗi khi lưu vào Database:', error.message);
  }
}

seedInitialSurvey()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
