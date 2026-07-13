import ChecklistContainer from '@/components/checklist/ChecklistContainer';

export const metadata = {
    title: 'Báo cáo ngày | Automation Gen Video',
    description: 'Báo cáo tiến độ checklist công việc hàng ngày của Editor.',
};

export default function ChecklistPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">Checklist Công Việc</h1>
                    <p className="text-sm text-gray-500">Cập nhật tiến độ và chi tiết công việc hàng ngày.</p>
                </div>
            </div>

            <ChecklistContainer />
        </div>
    );
}
