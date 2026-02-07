import { Users, BookOpen, Heart, Pen } from 'lucide-react'

export const metadata = {
  title: 'Hakkımızda | Deri ve Kemik',
  description: 'Deri ve Kemik hakkında. Yazarlarımız, felsefemiz ve edebi vizyonumuz.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-playfair text-4xl font-bold text-primary mb-4">
            Hakkımızda
          </h1>
          <p className="font-crimson text-xl text-muted-foreground leading-relaxed">
            Yüzeyi sıyırıp öze ulaşmak
          </p>
        </div>

        {/* Philosophy */}
        <section className="mb-16">
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 p-8 md:p-12 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-8 h-8 text-primary" />
              <h2 className="font-playfair text-3xl font-bold text-primary">
                Deri ve Kemik Felsefesi
              </h2>
            </div>
            <div className="font-crimson text-lg leading-relaxed text-foreground/80 space-y-4">
              <p>
                <strong className="text-primary">Deri ve Kemik</strong>, sadece bir edebiyat
                projesi değil, aynı zamanda bir düşünce tarzıdır. İsim, insanın en
                temel iki fiziksel bileşenini - yüzey (deri) ve öz (kemik) - sembolize
                eder.
              </p>
              <p>
                <span className="text-primary font-semibold">Deri</span>, dış dünyanın gördüğü
                yüzey, sosyal maskeler, günlük hayatın yüzeyselliğidir. 
                <span className="text-secondary font-semibold"> Kemik</span> ise altında yatan
                gerçeklik, varoluşun çıplak hakikati, insanın iç iskeletidir.
              </p>
              <p>
                Edebi yaklaşımımız, bu iki katman arasındaki yolculuğa odaklanır.
                Yüzeysel olayörgülerinin altında yatan derin psikolojik ve felsefi
                gerilimleri keşfetmek, okuru sadece eğlendirmekle kalmayıp düşündürmek
                ve dönüştürmek amacındayız.
              </p>
            </div>
          </div>
        </section>

        {/* Authors */}
        <section className="mb-16">
          <h2 className="font-playfair text-3xl font-bold text-primary mb-8 text-center">
            Yazarlarımız
          </h2>
          
          <div className="grid gap-8 md:grid-cols-2">
            {/* Deri */}
            <div className="rounded-xl bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Pen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-playfair text-2xl font-semibold text-primary">
                  Deri
                </h3>
              </div>
              <p className="font-crimson text-base leading-relaxed text-foreground/80">
                Deri, insan psikolojisinin inceliklerine ve duyguların katmanlarına
                odaklanan bir yazar. Sessizliğin edebi gücüne inanan, sade ama
                etkili bir dille yazdığı öykülerinde günlük hayatın sıradan
                detaylarını derin anlamlara dönüştürür.
              </p>
            </div>

            {/* Kemik */}
            <div className="rounded-xl bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <Pen className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-playfair text-2xl font-semibold text-secondary">
                  Kemik
                </h3>
              </div>
              <p className="font-crimson text-base leading-relaxed text-foreground/80">
                Kemik, varoluşun temel sorularıyla yüzleşen, felsefi derinliği
                edebiyatla harmanlayan bir yazar. Öykülerinde toplumsal normları
                sorgular, bireyin iç dünyasına iner ve okuru rahat bırakmayan
                metinler yaratır.
              </p>
            </div>
          </div>
        </section>

        {/* Literary Vision */}
        <section>
          <div className="rounded-2xl bg-gradient-to-br from-secondary/5 to-primary/5 p-8 md:p-12 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-8 h-8 text-secondary" />
              <h2 className="font-playfair text-3xl font-bold text-secondary">
                Edebi Vizyonumuz
              </h2>
            </div>
            <div className="font-crimson text-lg leading-relaxed text-foreground/80 space-y-4">
              <p>
                Türk edebiyatının zengin geleneğini çağdaş anlatım teknikleriyle
                birleştiriyor, evrensel temaları yerel duyarlılıklarla harmanlayan
                öyküler yazıyoruz.
              </p>
              <p>
                Her öykümüz, okuru sadece bir hikaye dinleyicisi değil, aynı zamanda
                kendi hayatının sorgulayıcısı yapmayı hedefler. Edebiyatın sadece
                estetik bir deneyim değil, aynı zamanda bir dönüşüm aracı olduğuna
                inanıyoruz.
              </p>
              <p>
                Deri ve Kemik olarak, okurlarımızla birlikte büyümeyi, onların
                yorumlarından ve görüşlerinden ilham almayı, Türk edebiyatına
                anlamlı katkılar sunmayı amaçlıyoruz.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}