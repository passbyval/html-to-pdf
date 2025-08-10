import logo from '@/assets/logo.svg'
import { Header } from '@/components/Header'
import { ThemeProvider } from '@/components/ThemeProvider'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { faker } from '@faker-js/faker'
import { type ComponentProps, type PropsWithChildren } from 'react'
import { AnimatedPercentage } from './components/AnimatedPercentage'
import { Button } from './components/ui/button'
import { Box } from './lib/components/Box'
import { useDocument } from './lib/useDocument'
import { DocumentHeader } from './lib/components/DocumentHeader'
import { times } from './utils/times'

interface ITableData {
  accountNumber: string
  amount: string
  creditCardIssuer: string
  creditCardNumber: string
  currencySymbol: string
  paid: string
}

const {
  accountNumber,
  amount,
  creditCardIssuer,
  creditCardNumber,
  currencySymbol
} = faker.finance

const data = times<ITableData>(50, () => {
  const res = Object.entries({
    amount,
    accountNumber,
    creditCardIssuer,
    creditCardNumber,
    currencySymbol,
    paid: () => (faker.datatype.boolean() ? 'Paid' : 'Unpaid')
  }).map(([key, value]) => [key, value()])

  return Object.fromEntries(res)
})

const data2: ITableData[] = JSON.parse(
  '[{"amount":"69.17","accountNumber":"56683508","creditCardIssuer":"visa","creditCardNumber":"4344789287891","currencySymbol":"Nu","paid":"Unpaid"},{"amount":"878.43","accountNumber":"84155018","creditCardIssuer":"mastercard","creditCardNumber":"3672-568517-5903","currencySymbol":"$","paid":"Paid"},{"amount":"474.19","accountNumber":"98746798","creditCardIssuer":"discover","creditCardNumber":"4153-4465-8497-5009","currencySymbol":"L","paid":"Unpaid"},{"amount":"316.26","accountNumber":"48962365","creditCardIssuer":"discover","creditCardNumber":"4551-4300-8904-6688","currencySymbol":"R$","paid":"Unpaid"},{"amount":"530.89","accountNumber":"43842403","creditCardIssuer":"american_express","creditCardNumber":"2561-5559-2478-7245","currencySymbol":"$","paid":"Paid"},{"amount":"385.37","accountNumber":"12002074","creditCardIssuer":"mastercard","creditCardNumber":"5163-8437-8450-8165","currencySymbol":"¥","paid":"Paid"},{"amount":"115.36","accountNumber":"23941329","creditCardIssuer":"diners_club","creditCardNumber":"6508-4302-2926-2533","currencySymbol":"₹","paid":"Paid"},{"amount":"996.32","accountNumber":"97426402","creditCardIssuer":"visa","creditCardNumber":"3434-137439-29680","currencySymbol":"﷼","paid":"Unpaid"},{"amount":"843.22","accountNumber":"74259113","creditCardIssuer":"diners_club","creditCardNumber":"6537-5745-1447-4488","currencySymbol":"฿","paid":"Unpaid"},{"amount":"201.44","accountNumber":"26280502","creditCardIssuer":"discover","creditCardNumber":"3018-181116-3726","currencySymbol":"$","paid":"Unpaid"},{"amount":"219.69","accountNumber":"89175936","creditCardIssuer":"american_express","creditCardNumber":"5187-0611-3895-9610","currencySymbol":"﷼","paid":"Unpaid"},{"amount":"537.98","accountNumber":"40277933","creditCardIssuer":"mastercard","creditCardNumber":"3635-666155-3101","currencySymbol":"BZ$","paid":"Paid"},{"amount":"781.47","accountNumber":"21369490","creditCardIssuer":"visa","creditCardNumber":"6497-1512-8197-2008","currencySymbol":"$","paid":"Paid"},{"amount":"320.53","accountNumber":"53928117","creditCardIssuer":"discover","creditCardNumber":"6570-9449-4424-5154","currencySymbol":"$","paid":"Paid"},{"amount":"594.72","accountNumber":"51441946","creditCardIssuer":"discover","creditCardNumber":"3446-646206-66717","currencySymbol":"Ft","paid":"Unpaid"},{"amount":"855.35","accountNumber":"11400581","creditCardIssuer":"american_express","creditCardNumber":"5423-6555-4074-1567","currencySymbol":"₪","paid":"Unpaid"},{"amount":"579.63","accountNumber":"87335610","creditCardIssuer":"american_express","creditCardNumber":"6498-9098-4744-9053","currencySymbol":"Bs","paid":"Paid"},{"amount":"576.73","accountNumber":"23466360","creditCardIssuer":"discover","creditCardNumber":"3469-163153-01713","currencySymbol":"₱","paid":"Paid"},{"amount":"986.87","accountNumber":"32296010","creditCardIssuer":"mastercard","creditCardNumber":"2537-9480-6293-5208","currencySymbol":"؋","paid":"Unpaid"},{"amount":"821.77","accountNumber":"32489327","creditCardIssuer":"discover","creditCardNumber":"2334-3406-9647-6020","currencySymbol":"Db","paid":"Unpaid"},{"amount":"307.31","accountNumber":"18289904","creditCardIssuer":"discover","creditCardNumber":"3546-9314-6872-5818","currencySymbol":"P","paid":"Unpaid"},{"amount":"875.89","accountNumber":"20432674","creditCardIssuer":"jcb","creditCardNumber":"4398-7618-9636-1416","currencySymbol":"₨","paid":"Paid"},{"amount":"574.60","accountNumber":"21433781","creditCardIssuer":"discover","creditCardNumber":"3528-5452-6526-3807","currencySymbol":"kr","paid":"Paid"},{"amount":"990.45","accountNumber":"20169107","creditCardIssuer":"mastercard","creditCardNumber":"3459-866582-11432","currencySymbol":"₴","paid":"Unpaid"},{"amount":"488.99","accountNumber":"43290891","creditCardIssuer":"discover","creditCardNumber":"3573-9679-3327-2081","currencySymbol":"₨","paid":"Paid"},{"amount":"162.74","accountNumber":"05827019","creditCardIssuer":"jcb","creditCardNumber":"3411-722845-33036","currencySymbol":"₹","paid":"Paid"},{"amount":"900.87","accountNumber":"56897146","creditCardIssuer":"mastercard","creditCardNumber":"3665-317040-1214","currencySymbol":"kr","paid":"Unpaid"},{"amount":"284.28","accountNumber":"24189124","creditCardIssuer":"mastercard","creditCardNumber":"6526-3022-2390-0301","currencySymbol":"﷼","paid":"Unpaid"},{"amount":"983.36","accountNumber":"58639730","creditCardIssuer":"visa","creditCardNumber":"4302957322049","currencySymbol":"₩","paid":"Paid"},{"amount":"369.10","accountNumber":"01124169","creditCardIssuer":"jcb","creditCardNumber":"3528-7382-3449-2231","currencySymbol":"£","paid":"Unpaid"},{"amount":"230.52","accountNumber":"31561013","creditCardIssuer":"mastercard","creditCardNumber":"4911108581954","currencySymbol":"₨","paid":"Paid"},{"amount":"203.67","accountNumber":"40737902","creditCardIssuer":"jcb","creditCardNumber":"3674-539325-4113","currencySymbol":"K","paid":"Unpaid"},{"amount":"168.21","accountNumber":"31030218","creditCardIssuer":"american_express","creditCardNumber":"3021-168478-3985","currencySymbol":"؋","paid":"Unpaid"},{"amount":"488.93","accountNumber":"58526687","creditCardIssuer":"jcb","creditCardNumber":"6011-0786-4985-8735","currencySymbol":"﷼","paid":"Paid"},{"amount":"809.48","accountNumber":"23701511","creditCardIssuer":"discover","creditCardNumber":"5121-6546-2978-7646","currencySymbol":"₨","paid":"Unpaid"},{"amount":"646.51","accountNumber":"16365251","creditCardIssuer":"jcb","creditCardNumber":"4803050993578","currencySymbol":"£","paid":"Unpaid"},{"amount":"257.17","accountNumber":"69512481","creditCardIssuer":"jcb","creditCardNumber":"3548-9051-1722-7598","currencySymbol":"$","paid":"Unpaid"},{"amount":"62.10","accountNumber":"07686701","creditCardIssuer":"visa","creditCardNumber":"2625-3298-3717-1697","currencySymbol":"$","paid":"Paid"},{"amount":"858.84","accountNumber":"77025626","creditCardIssuer":"jcb","creditCardNumber":"3569-8653-3044-2545","currencySymbol":"L","paid":"Paid"},{"amount":"570.40","accountNumber":"41131691","creditCardIssuer":"american_express","creditCardNumber":"3792-284747-74890","currencySymbol":"S","paid":"Paid"},{"amount":"684.63","accountNumber":"20157511","creditCardIssuer":"american_express","creditCardNumber":"3452-009608-39595","currencySymbol":"Php","paid":"Unpaid"},{"amount":"970.50","accountNumber":"61156869","creditCardIssuer":"diners_club","creditCardNumber":"5177-4221-0292-4083","currencySymbol":"₨","paid":"Paid"},{"amount":"108.86","accountNumber":"08269562","creditCardIssuer":"mastercard","creditCardNumber":"3529-7293-0585-8979","currencySymbol":"$","paid":"Unpaid"},{"amount":"342.71","accountNumber":"94594172","creditCardIssuer":"jcb","creditCardNumber":"6560-8898-0797-6050","currencySymbol":"$","paid":"Paid"},{"amount":"502.99","accountNumber":"53660823","creditCardIssuer":"diners_club","creditCardNumber":"3469-456815-43855","currencySymbol":"lei","paid":"Paid"},{"amount":"170.91","accountNumber":"25022706","creditCardIssuer":"diners_club","creditCardNumber":"4730784033043","currencySymbol":"$","paid":"Unpaid"},{"amount":"745.09","accountNumber":"52996181","creditCardIssuer":"mastercard","creditCardNumber":"4397-4317-3147-0837","currencySymbol":"£","paid":"Unpaid"},{"amount":"886.79","accountNumber":"04121509","creditCardIssuer":"american_express","creditCardNumber":"3406-391762-06716","currencySymbol":"Bs","paid":"Unpaid"},{"amount":"274.94","accountNumber":"84354094","creditCardIssuer":"american_express","creditCardNumber":"4765-3625-3807-9691","currencySymbol":"ден","paid":"Unpaid"},{"amount":"520.36","accountNumber":"04630441","creditCardIssuer":"visa","creditCardNumber":"3528-1186-8248-4941","currencySymbol":"S/.","paid":"Paid"}]'
)

function App() {
  const { Document, create, Viewer, PreviewImage, isCreating, progress } =
    useDocument({
      debug: 'all'
    })

  const onClick = async () => {
    const { download } = await create()
    download()
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Box className="absolute" top={25} right={25} zIndex={99}>
        <Button
          style={{ minWidth: 71 }}
          loading={isCreating}
          variant="secondary"
          onClick={onClick}
        >
          Get <AnimatedPercentage percent={progress} />
        </Button>
      </Box>
      <div className="flex justify-center items-center h-screen w-screen gap-1">
        {/*<Viewer />*/}
        {/* <PreviewImage /> */}
        <Document>
          <DocumentHeader as={Header}>
            <img
              data-ocr="Logoipsum"
              data-ocr-x="75"
              src={logo}
              loading="lazy"
              className="w-[300px] mb-6"
            />
          </DocumentHeader>
          <Table className="overflow-hidden">
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Account #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Card</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data2.map(
                ({
                  amount,
                  accountNumber,
                  creditCardIssuer,
                  creditCardNumber,
                  currencySymbol,
                  paid
                }) => {
                  const Cell = ({
                    children,
                    ...props
                  }: PropsWithChildren<ComponentProps<'td'>>) => (
                    <TableCell suppressHydrationWarning {...props}>
                      {children}
                    </TableCell>
                  )

                  return (
                    <TableRow key={accountNumber}>
                      <Cell className="font-medium">{accountNumber}</Cell>
                      <Cell>{paid}</Cell>
                      <Cell>
                        {`#${creditCardNumber.slice(-4)} ${creditCardIssuer}`}
                      </Cell>
                      <Cell className="text-right">{`${currencySymbol} ${amount}`}</Cell>
                    </TableRow>
                  )
                }
              )}
            </TableBody>
          </Table>
        </Document>
      </div>
    </ThemeProvider>
  )
}

export default App
