"use client";

import { useMemo, useState } from "react";
import { Mail, Send, MessageCircle } from "lucide-react";

type Locale = "tr" | "en" | "fr" | "ar";

type Copy = {
  title: string;
  subtitle: string;

  emailsTitle: string;
  reachDeri: string;
  reachKemik: string;

  feedbackTitle: string;
  feedbackBody: string;

  formTitle: string;
  nameLabel: string;
  emailLabel: string;
  subjectLabel: string;
  messageLabel: string;

  btnSend: string;
  btnSending: string;

  requiredError: string;
  successMsg: string;
  genericError: string;
  connectionError: string;
};

const TEXT: Record<Locale, Copy> = {
  tr: {
    title: "İletişim",
    subtitle: "Sorularınız, görüşleriniz veya işbirliği teklifleriniz için bize ulaşabilirsiniz.",

    emailsTitle: "Email Adreslerimiz",
    reachDeri: "Deri'ye ulaşın:",
    reachKemik: "Kemik'e ulaşın:",

    feedbackTitle: "Geri Bildiriminiz Bizim İçin Önemli",
    feedbackBody:
      "Öykülerimiz hakkındaki düşüncelerinizi, önerilerinizi veya katkılarınızı bizimle paylaşmaktan çekinmeyin. Her mesajınızı dikkatlice okuyoruz.",

    formTitle: "Bize Mesaj Gönderin",
    nameLabel: "Adınız *",
    emailLabel: "Email *",
    subjectLabel: "Konu",
    messageLabel: "Mesajınız *",

    btnSend: "Mesaj Gönder",
    btnSending: "Gönderiliyor...",

    requiredError: "Lütfen tüm zorunlu alanları doldurun",
    successMsg: "Mesajınız başarıyla gönderildi!",
    genericError: "Bir hata oluştu",
    connectionError: "Bağlantı hatası oluştu",
  },

  en: {
    title: "Contact",
    subtitle: "For questions, feedback, or collaboration proposals, feel free to reach out.",

    emailsTitle: "Our Email Addresses",
    reachDeri: "Reach deri:",
    reachKemik: "Reach kemik:",

    feedbackTitle: "Your Feedback Matters",
    feedbackBody:
      "Share your thoughts, suggestions, or collaboration ideas with us. We read every message carefully.",

    formTitle: "Send Us a Message",
    nameLabel: "Your Name *",
    emailLabel: "Email *",
    subjectLabel: "Subject",
    messageLabel: "Your Message *",

    btnSend: "Send Message",
    btnSending: "Sending...",

    requiredError: "Please fill in all required fields",
    successMsg: "Your message has been sent!",
    genericError: "Something went wrong",
    connectionError: "Connection error occurred",
  },

  fr: {
    title: "Contact",
    subtitle: "Pour toute question, retour ou proposition de collaboration, écrivez-nous.",

    emailsTitle: "Nos adresses email",
    reachDeri: "Contacter deri :",
    reachKemik: "Contacter kemik :",

    feedbackTitle: "Votre avis compte",
    feedbackBody:
      "Partagez vos impressions, vos suggestions ou vos idées de collaboration. Nous lisons chaque message avec attention.",

    formTitle: "Envoyez-nous un message",
    nameLabel: "Votre nom *",
    emailLabel: "Email *",
    subjectLabel: "Sujet",
    messageLabel: "Votre message *",

    btnSend: "Envoyer",
    btnSending: "Envoi...",

    requiredError: "Veuillez remplir tous les champs obligatoires",
    successMsg: "Votre message a bien été envoyé !",
    genericError: "Une erreur est survenue",
    connectionError: "Erreur de connexion",
  },

  ar: {
    title: "تواصل",
    subtitle: "للأسئلة أو الملاحظات أو مقترحات التعاون، يسعدنا أن تكتبوا إلينا.",

    emailsTitle: "عناوين البريد",
    reachDeri: "للتواصل مع ديري:",
    reachKemik: "للتواصل مع كيميك:",

    feedbackTitle: "ملاحظاتك تهمّنا",
    feedbackBody:
      "شاركنا أفكارك واقتراحاتك أو عروض التعاون. نقرأ كل رسالة بعناية.",

    formTitle: "أرسل لنا رسالة",
    nameLabel: "الاسم *",
    emailLabel: "البريد الإلكتروني *",
    subjectLabel: "الموضوع",
    messageLabel: "الرسالة *",

    btnSend: "إرسال",
    btnSending: "جارٍ الإرسال...",

    requiredError: "يرجى تعبئة جميع الحقول المطلوبة",
    successMsg: "تم إرسال رسالتك بنجاح!",
    genericError: "حدث خطأ ما",
    connectionError: "حدث خطأ في الاتصال",
  },
};

export default function ContactPage({ locale = "tr" }: { locale?: Locale }) {
  const t = useMemo(() => TEXT[locale], [locale]);
  const isAr = locale === "ar";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();

    if (!formData?.name || !formData?.email || !formData?.message) {
      setMessage(t.requiredError);
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response?.json?.();

      if (response?.ok) {
        setStatus("success");
        setMessage(t.successMsg);
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setMessage(data?.error ?? t.genericError);
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("error");
      setMessage(t.connectionError);
    }
  };

  return (
    <div className="min-h-screen py-12" dir={isAr ? "rtl" : "ltr"}>
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Mail className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-primary mb-4">
            {t.title}
          </h1>
          <p className="font-crimson text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="rounded-xl bg-card p-6 shadow-md">
              <h3 className="font-playfair text-xl font-semibold text-primary mb-4">
                {t.emailsTitle}
              </h3>
              <div className="space-y-3 font-inter text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">{t.reachDeri}</p>
                  <a
                    href="mailto:deri@derivekemik.com"
                    className="text-primary hover:text-secondary transition-colors flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    deri@derivekemik.com
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">{t.reachKemik}</p>
                  <a
                    href="mailto:kemik@derivekemik.com"
                    className="text-secondary hover:text-primary transition-colors flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    kemik@derivekemik.com
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5 p-6 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-playfair text-lg font-semibold text-primary">
                  {t.feedbackTitle}
                </h3>
              </div>
              <p className="font-crimson text-sm text-foreground/80 leading-relaxed">
                {t.feedbackBody}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-xl bg-card p-6 shadow-md">
            <h3 className="font-playfair text-xl font-semibold text-primary mb-6">
              {t.formTitle}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  value={formData?.name}
                  onChange={(e) => setFormData({ ...formData, name: e?.target?.value ?? "" })}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={status === "loading"}
                  required
                />
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={formData?.email}
                  onChange={(e) => setFormData({ ...formData, email: e?.target?.value ?? "" })}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={status === "loading"}
                  required
                />
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  {t.subjectLabel}
                </label>
                <input
                  type="text"
                  value={formData?.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e?.target?.value ?? "" })}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={status === "loading"}
                />
              </div>

              <div>
                <label className="block font-inter text-sm font-medium text-foreground mb-2">
                  {t.messageLabel}
                </label>
                <textarea
                  value={formData?.message}
                  onChange={(e) => setFormData({ ...formData, message: e?.target?.value ?? "" })}
                  rows={5}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2 font-inter text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  disabled={status === "loading"}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-inter text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {status === "loading" ? t.btnSending : t.btnSend}
              </button>

              {message && (
                <p
                  className={`text-sm text-center ${
                    status === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
