'use client';

import { Loader2 } from 'lucide-react';
import { IdPhotoPosition } from './constants';
import { EmployeeInfoFields, isEmployeeInfoValid } from './EmployeeInfoFields';

/**
 * Bước 3 — nhập thông tin nhân viên lần đầu, trước khi tạo bản ghi.
 *
 * Phần thân form dùng chung với panel "Sửa thông tin" ở bước 4 (xem EmployeeInfoFields);
 * ở đây chỉ còn footer "Quay lại / Tiếp tục" riêng của bước này.
 */
export function InfoStep({
  employeeName,
  employeeTeam,
  employeeId,
  employeeTitlePrefix,
  position,
  isSubmitting,
  onChangeEmployeeName,
  onChangeEmployeeTeam,
  onChangeEmployeeId,
  onChangeEmployeeTitlePrefix,
  onChangePosition,
  onBack,
  onContinue,
}: {
  employeeName: string;
  employeeTeam: string;
  employeeId: string;
  employeeTitlePrefix: string;
  position: IdPhotoPosition;
  isSubmitting: boolean;
  onChangeEmployeeName: (v: string) => void;
  onChangeEmployeeTeam: (v: string) => void;
  onChangeEmployeeId: (v: string) => void;
  onChangeEmployeeTitlePrefix: (v: string) => void;
  onChangePosition: (v: IdPhotoPosition) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const values = { employeeName, employeeTeam, employeeId, employeeTitlePrefix, position };
  const isValid = isEmployeeInfoValid(values);

  return (
    <div className="border border-[#e2e0ea] rounded-2xl bg-white p-6">
      <EmployeeInfoFields
        values={values}
        radioGroupName="position-create"
        onChange={(patch) => {
          if (patch.employeeName !== undefined) onChangeEmployeeName(patch.employeeName);
          if (patch.employeeTeam !== undefined) onChangeEmployeeTeam(patch.employeeTeam);
          if (patch.employeeId !== undefined) onChangeEmployeeId(patch.employeeId);
          if (patch.employeeTitlePrefix !== undefined) onChangeEmployeeTitlePrefix(patch.employeeTitlePrefix);
          if (patch.position !== undefined) onChangePosition(patch.position);
        }}
      />

      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#d5d3e0] text-[#464554] hover:border-[#4441cc] hover:text-[#4441cc] transition-colors"
        >
          Quay lại
        </button>
        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={onContinue}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-[#4441cc] hover:bg-[#4441cc]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang tạo...
            </>
          ) : (
            'Tiếp tục'
          )}
        </button>
      </div>
    </div>
  );
}
