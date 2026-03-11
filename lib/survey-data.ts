export type SurveyOption = {
    id: string;
    label: string;
    nextQuestionId?: string;
    recommendedCourseIds?: number[];
    isAdvice?: boolean; // Nếu true sẽ mở Popup tư vấn
};

export type SurveyQuestion = {
    id: string;
    question: string;
    subtitle?: string;
    type: 'CHOICE' | 'INPUT_ACCOUNT' | 'INPUT_GOAL';
    options?: SurveyOption[];
};

export const surveyQuestions: Record<string, SurveyQuestion> = {
    // TẦNG 1
    q1: {
        id: 'q1',
        question: 'Bạn muốn học để làm gì?',
        subtitle: 'Xác định hướng đi chính của bạn tại Học viện BRK.',
        type: 'CHOICE',
        options: [
            { id: 'selling', label: 'Bán hàng', nextQuestionId: 'q2_selling' },
            { id: 'branding', label: 'Xây dựng nhân hiệu', nextQuestionId: 'q2_branding' },
            { id: 'spreading', label: 'Lan tỏa giá trị TLGDTG', nextQuestionId: 'q2_spreading' },
            { id: 'unknown', label: 'Chưa biết - cần tư vấn thêm', isAdvice: true }
        ]
    },

    // TẦNG 2: Nhánh Bán hàng
    q2_selling: {
        id: 'q2_selling',
        question: 'Hình thức bán hàng bạn chọn?',
        type: 'CHOICE',
        options: [
            { id: 'own_product', label: 'Bán sản phẩm của bạn', nextQuestionId: 'q3_account_shop' },
            { id: 'affiliate', label: 'Bán tiếp thị liên kết', nextQuestionId: 'q3_account_1k' },
            { id: 'service', label: 'Bán dịch vụ', nextQuestionId: 'q3_account_basic' },
            { id: 'selling_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
        ]
    },

    // TẦNG 2: Nhánh Nhân hiệu
    q2_branding: {
        id: 'q2_branding',
        question: 'Vị thế hiện tại của bạn?',
        type: 'CHOICE',
        options: [
            { id: 'expert', label: 'Đã là chuyên gia trong lĩnh vực', nextQuestionId: 'q3_account_basic' },
            { id: 'learning_expert', label: 'Đang học trở thành chuyên gia', nextQuestionId: 'q3_account_basic' },
            { id: 'branding_advice', label: 'Chưa rõ, cần tư vấn thêm', isAdvice: true }
        ]
    },

    // TẦNG 2: Nhánh Lan tỏa
    q2_spreading: {
        id: 'q2_spreading',
        question: 'Nền tảng nội tâm của bạn?',
        type: 'CHOICE',
        options: [
            { id: 'mentor_wit', label: 'Đã tốt nghiệp Mentor WiT trở lên', nextQuestionId: 'q3_account_basic' },
            { id: 'wit_7', label: 'Đang học Mentor WiT 7', nextQuestionId: 'q3_account_basic' }
        ]
    },

    // TẦNG 3: Kiểm tra tài khoản
    q3_account_shop: {
        id: 'q3_account_shop',
        question: 'Bạn đã có TikTok Shop chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần tạo shop)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },
    q3_account_1k: {
        id: 'q3_account_1k',
        question: 'Tài khoản có trên 1000 follow chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần chinh phục 1k follow)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },
    q3_account_basic: {
        id: 'q3_account_basic',
        question: 'Bạn đã có kênh TikTok/FB/Youtube chưa?',
        type: 'INPUT_ACCOUNT',
        options: [
            { id: 'no', label: 'Chưa có (Cần xây nền tảng)', nextQuestionId: 'q4_goal' },
            { id: 'yes', label: 'Đã có (Nhập thông tin)', nextQuestionId: 'q4_goal' }
        ]
    },

    // TẦNG 4: Mục tiêu
    q4_goal: {
        id: 'q4_goal',
        question: 'Thiết lập mục tiêu hành động',
        type: 'INPUT_GOAL',
        options: [
            { id: 'no', label: 'Chưa có mục tiêu cụ thể', nextQuestionId: 'done' },
            { id: 'yes', label: 'Đã sẵn sàng mục tiêu', nextQuestionId: 'done' }
        ]
    }
};

/**
 * Lộ trình chuẩn của Học viện BRK
 * ID: 15(MXH), 18(Video CB), 3(1k Follow), 4(Live CB), 19(Video NC), 19(Live NC), 2(Nhân hiệu), 20(Đào tạo), 21(Cộng đồng), 22(Hệ thống)
 */
export function generatePathFromAnswers(answers: Record<string, any>): number[] {
    const commonPath = [15, 18, 4, 19, 2, 20, 21, 22]; // Lộ trình gốc
    let finalPath = [...commonPath];

    // Nhánh Affiliate chưa có 1k follow -> Chèn thêm khóa ID 3
    if (answers['q2_selling'] === 'affiliate' && answers['q3_account_1k_status'] === 'no') {
        if (!finalPath.includes(3)) {
            finalPath.splice(2, 0, 3); // Chèn vào vị trí số 3 trong lộ trình
        }
    }

    return finalPath;
}
