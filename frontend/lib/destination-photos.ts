// The demo seed uses these Wikimedia destination photos. Other uploaded images are listed as property photos.
const labels = new Map(Object.entries({
  ramsar: "ساحل رامسر",
  ramsar2: "ساحل رامسر",
  kelardasht: "کلاردشت",
  kelardasht2: "کلاردشت",
  masuleh: "روستای ماسوله",
  masuleh2: "روستای ماسوله",
  kandovan: "روستای کندوان",
  kandovan2: "روستای کندوان",
  yazd: "یزد",
  yazd2: "یزد",
  kashan: "خانهٔ طباطبایی‌های کاشان",
  kashan2: "خانهٔ طباطبایی‌های کاشان",
  qeshm: "ساحل قشم",
  qeshm2: "درهٔ ستاره‌ها",
  isfahan: "میدان نقش جهان",
  isfahan2: "میدان نقش جهان",
  shiraz: "باغ ارم شیراز",
  filband: "فیلبند",
  abyaneh: "درهٔ برزرود ابیانه",
  abyaneh2: "روستای ابیانه",
  tochal: "توچال",
  bisheh: "آبشار بیشه",
  bisheh2: "آبشار بیشه",
  anzali: "تالاب انزلی",
  anzali2: "تالاب انزلی",
}));

export function destinationPhotoLabel(url: string | null | undefined) {
  const match = url?.match(/^\/stays\/([a-z0-9]+)\.jpg$/);
  return match ? labels.get(match[1]) : undefined;
}
