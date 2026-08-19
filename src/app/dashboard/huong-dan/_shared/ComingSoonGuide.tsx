'use client';

import { BookOpen } from 'lucide-react';

export default function ComingSoonGuide({ title }: { title: string }) {
  return (
    <div className="-m-6 p-8 min-h-[calc(100vh-64px)] bg-background text-foreground flex items-center justify-center">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4">
          <BookOpen size={26} />
        </div>
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Nội dung hướng dẫn cho mục này đang được biên soạn, sẽ cập nhật sớm.
        </p>
      </div>
    </div>
  );
}
