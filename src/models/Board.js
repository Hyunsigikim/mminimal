const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
  // 기본 정보
  name: { type: String, required: true }, // 타이틀
  description: { type: String },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 작성자
  createdAt: { type: Date, default: Date.now }, // 작성일

  // 위치 정보
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String }, // 주소(텍스트)

  // 현장 메타정보
  memo: { type: String }, // 메모
  siteType: { type: String }, // 현장 타입(카테고리)
  siteStatus: { type: String, enum: ['숨김', '정상', '공사 중', '예정', '중단', '보류'], default: '정상' }, // 현장 상태
  tags: { type: [String], index: true } // 태그(검색가능)
});

// 텍스트 검색을 위한 인덱스 (선택)
try {
  BoardSchema.index({ name: 'text', description: 'text', memo: 'text', address: 'text', tags: 'text' });
} catch (e) {
  // ignore index creation errors during hot reload
}

module.exports = mongoose.model('Board', BoardSchema);
