// 자체 선별한 중학 일상·학교생활 핵심어. 상업 교재 목록을 전재하지 않는다.
const RAW = `
you|너, 당신
the|그, 바로 그
to|~에게, ~로
it|그것
that|저것, ~라는 것
and|그리고
of|~의
what|무엇
in|~안에
me|나를, 나에게
is|~이다
we|우리
this|이것
he|그
on|~위에
for|~을 위해
my|나의
your|너의, 당신의
have|가지다
do|하다
no|아니요, 없는
be|~이다, 있다
know|알다
was|~이었다
not|~아니다
can|~할 수 있다
are|~이다
all|모든, 전부
with|~와 함께
here|여기에
but|그러나
there|거기에, 있다
so|그래서, 매우
they|그들
like|좋아하다, ~처럼
out|밖에
go|가다
she|그녀
up|위로
about|~에 관하여
if|만약
him|그를, 그에게
at|~에서
now|지금
come|오다
one|하나
how|어떻게
well|잘
her|그녀를, 그녀의
want|원하다
think|생각하다
good|좋은
see|보다
let|~하게 두다
why|왜
who|누구
as|~처럼, ~로서
his|그의
will|~할 것이다
from|~로부터
when|언제, ~할 때
back|뒤, 돌아가서
yes|네
time|시간
look|보다
take|가지고 가다
an|하나의
man|남자
where|어디
them|그들을
would|~할 것이다
some|몇몇, 약간
tell|말하다
or|또는
us|우리를, 우리에게
had|가지고 있었다
were|~이었다
say|말하다
could|~할 수 있었다
something|무언가
really|정말로
down|아래로
then|그때, 그러면
little|작은, 조금
way|길, 방법
our|우리의
too|너무, 또한
never|결코 ~않다
by|~옆에, ~에 의해
over|~위로, 끝난
more|더 많은
mean|의미하다
very|매우
off|떨어져, 꺼진
sorry|미안한
give|주다
has|가지고 있다
thank|감사하다
love|사랑하다
am|~이다
people|사람들
please|부디
any|어떤, 조금이라도
thing|것
only|오직
because|왜냐하면
two|둘
should|~해야 한다
much|많은
maybe|아마
help|돕다
anything|무엇이든
these|이것들
even|심지어
night|밤
talk|말하다
nothing|아무것도 없음
into|~안으로
first|첫째의
find|찾다
wait|기다리다
put|놓다
great|훌륭한
day|날, 하루
work|일하다, 일
life|삶
before|~전에
better|더 좋은
again|다시
still|아직, 여전히
home|집
those|저것들
than|~보다
around|주위에
other|다른
away|멀리
new|새로운
last|마지막의
ever|언젠가, 지금까지
stop|멈추다
must|~해야 한다
big|큰
after|~후에
long|긴, 오랫동안
always|항상
their|그들의
everything|모든 것
nice|좋은, 친절한
name|이름
old|나이 든, 오래된
place|장소
hello|안녕하세요
year|해, 년
leave|떠나다
girl|소녀
hear|듣다
father|아버지
through|~을 통하여
every|모든
bad|나쁜
listen|듣다
remember|기억하다
three|셋
boy|소년
wrong|틀린
might|~일지도 모른다
stay|머무르다
house|집
may|~일지도 모른다
another|또 다른
enough|충분한
care|돌보다, 관심
mind|마음
ask|묻다
car|자동차
understand|이해하다
mother|어머니
which|어느 것
try|시도하다
miss|놓치다, 그리워하다
world|세계
next|다음의
else|그 밖의
room|방
morning|아침
woman|여자
yourself|너 자신
today|오늘
friend|친구
same|같은
job|일, 직업
son|아들
best|가장 좋은
pretty|예쁜, 꽤
ready|준비된
whole|전체의
together|함께
minute|분
head|머리
matter|문제, 중요하다
many|많은
without|~없이
play|놀다, 경기하다
family|가족
most|대부분, 가장
run|달리다
while|~하는 동안
wife|아내
once|한 번
live|살다
somebody|누군가
everybody|모두
use|사용하다
myself|나 자신
yet|아직
start|시작하다
kid|아이
tomorrow|내일
happy|행복한
school|학교
problem|문제
watch|보다, 손목시계
hope|바라다
open|열다, 열린
since|~이래로
sit|앉다
alone|혼자인
hard|어려운, 열심히
turn|돌다, 차례
until|~까지
few|거의 없는, 몇몇
door|문
later|나중에
such|그러한
worry|걱정하다
ago|~전에
five|다섯
second|두 번째, 초
brother|형제
beautiful|아름다운
hand|손
late|늦은
phone|전화기
easy|쉬운
doctor|의사
under|~아래에
part|부분
soon|곧
four|넷
anyone|누구든지
pay|지불하다
happen|일어나다
true|사실인
each|각각의
eat|먹다
town|마을
afraid|두려워하는
drink|마시다, 음료
hurt|다치다, 아프게 하다
heart|심장, 마음
young|젊은
everyone|모두
chance|기회
read|읽다
number|숫자
week|주
police|경찰
word|단어
fun|재미
game|게임, 경기
sleep|자다
water|물
story|이야기
walk|걷다
person|사람
different|다른
important|중요한
teacher|교사
student|학생
class|수업, 학급
lesson|수업
subject|과목, 주제
homework|숙제
question|질문
test|시험
study|공부하다
write|쓰다
paper|종이
pen|펜
pencil|연필
desk|책상
chair|의자
library|도서관
computer|컴퓨터
picture|그림, 사진
map|지도
country|나라
city|도시
street|거리
road|길
restaurant|식당
hospital|병원
station|역
airport|공항
park|공원
food|음식
bread|빵
rice|쌀, 밥
fruit|과일
vegetable|채소
meat|고기
milk|우유
breakfast|아침 식사
lunch|점심 식사
apple|사과
banana|바나나
egg|달걀
fish|물고기
chicken|닭, 닭고기
cat|고양이
bird|새
tree|나무
flower|꽃
river|강
sea|바다
mountain|산
sky|하늘
sun|태양
moon|달
star|별
rain|비
snow|눈
weather|날씨
spring|봄
summer|여름
autumn|가을
winter|겨울
small|작은
tall|키가 큰
short|짧은, 키가 작은
fast|빠른
slow|느린
early|이른
clean|깨끗한, 청소하다
dirty|더러운
full|가득 찬
empty|빈
light|빛, 가벼운
heavy|무거운
strong|강한
weak|약한
kind|친절한, 종류
busy|바쁜
safe|안전한
dangerous|위험한
`;

export const MIDDLE_SCHOOL_CORE = RAW.trim().split('\n').map(line => {
  const [english, korean] = line.split('|');
  return { category: 'middle', english: english.toLowerCase(), korean, example: '' };
});
