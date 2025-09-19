import logo from '@/assets/logo.svg'
import logoSimple from '@/assets/logo-simple.svg'
import texture from '@/assets/texture.jpg'
import wiggle from '@/assets/wiggle.svg'
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
import { Box } from '@/lib/html-to-pdf/components/Box'
import { useDocument } from '@/lib/html-to-pdf/useDocument'
import { Separator } from './components/ui/separator'

interface ITableData {
  accountNumber: string
  amount: string
  creditCardIssuer: string
  creditCardNumber: string
  currencySymbol: string
  paid: string
}

const data: ITableData[] = [
  {
    amount: '264.73',
    accountNumber: '16936810',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3724-555414-18162',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '104.30',
    accountNumber: '95019228',
    creditCardIssuer: 'discover',
    creditCardNumber: '6011-3035-4477-7487',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '15.30',
    accountNumber: '52105759',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '3482-112621-20946',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '20.04',
    accountNumber: '12077435',
    creditCardIssuer: 'visa',
    creditCardNumber: '2226-0801-0043-7116',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '300.12',
    accountNumber: '45302457',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '6011-4984-4778-0453',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '530.87',
    accountNumber: '15965577',
    creditCardIssuer: 'american_express',
    creditCardNumber: '3528-7099-8687-7614',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '916.92',
    accountNumber: '45094701',
    creditCardIssuer: 'visa',
    creditCardNumber: '2513-6318-1421-9844',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '546.43',
    accountNumber: '27840008',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '5495-4631-6743-9562',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '286.86',
    accountNumber: '01240482',
    creditCardIssuer: 'american_express',
    creditCardNumber: '6475-4897-7095-5423',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '355.96',
    accountNumber: '18789591',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '4976341494521',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '309.38',
    accountNumber: '16594193',
    creditCardIssuer: 'american_express',
    creditCardNumber: '3582-0450-2764-0650',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '628.42',
    accountNumber: '00378053',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '3733-183786-30169',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '458.57',
    accountNumber: '62430182',
    creditCardIssuer: 'discover',
    creditCardNumber: '3528-2920-8932-7076',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '236.62',
    accountNumber: '01149944',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '3533-7790-1971-3147',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '169.38',
    accountNumber: '92447554',
    creditCardIssuer: 'visa',
    creditCardNumber: '3556-1056-0309-6073',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '164.23',
    accountNumber: '26058912',
    creditCardIssuer: 'visa',
    creditCardNumber: '3574-3195-3911-9671',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '285.10',
    accountNumber: '20066594',
    creditCardIssuer: 'american_express',
    creditCardNumber: '6473-2380-5522-0660',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '242.83',
    accountNumber: '83094826',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3529-1573-8153-9810',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '777.26',
    accountNumber: '21602437',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '4982-4707-3011-4708',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '40.20',
    accountNumber: '31399783',
    creditCardIssuer: 'jcb',
    creditCardNumber: '4954285953042',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '389.03',
    accountNumber: '21971445',
    creditCardIssuer: 'discover',
    creditCardNumber: '3016-323420-1176',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '42.14',
    accountNumber: '93652194',
    creditCardIssuer: 'discover',
    creditCardNumber: '6011-4036-4517-3931',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '2.34',
    accountNumber: '19579854',
    creditCardIssuer: 'jcb',
    creditCardNumber: '5389-3512-4499-3447',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '112.20',
    accountNumber: '04465485',
    creditCardIssuer: 'jcb',
    creditCardNumber: '4772989168331',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '933.89',
    accountNumber: '10115504',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3529-2430-7554-7838',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '611.36',
    accountNumber: '24066571',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3529-5652-8684-1877',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '813.24',
    accountNumber: '70460323',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '5470-3576-8403-7272',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '627.88',
    accountNumber: '47426451',
    creditCardIssuer: 'visa',
    creditCardNumber: '5472-5937-4161-5597',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '765.23',
    accountNumber: '20707928',
    creditCardIssuer: 'jcb',
    creditCardNumber: '4484-9089-0902-4136',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '140.51',
    accountNumber: '59972465',
    creditCardIssuer: 'discover',
    creditCardNumber: '3587-9879-3608-8379',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '245.57',
    accountNumber: '93284562',
    creditCardIssuer: 'american_express',
    creditCardNumber: '6011-3789-0019-9294',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '626.95',
    accountNumber: '56941798',
    creditCardIssuer: 'jcb',
    creditCardNumber: '3529-3150-1644-7391',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '62.71',
    accountNumber: '01577033',
    creditCardIssuer: 'discover',
    creditCardNumber: '3715-112985-10451',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '723.83',
    accountNumber: '38788336',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3486-827413-06548',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '378.67',
    accountNumber: '74800346',
    creditCardIssuer: 'discover',
    creditCardNumber: '6011-0091-8162-2718',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '455.61',
    accountNumber: '98396794',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '3461-762610-17009',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '23.99',
    accountNumber: '26379283',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3785-772495-04482',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '720.71',
    accountNumber: '71016133',
    creditCardIssuer: 'discover',
    creditCardNumber: '2698-9581-4166-3486',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '456.30',
    accountNumber: '49455973',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '6522-6869-1305-0649',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '372.46',
    accountNumber: '37139093',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3529-9272-7810-9954',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '263.55',
    accountNumber: '24671010',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '4865-3921-7567-5286',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '985.02',
    accountNumber: '14348723',
    creditCardIssuer: 'discover',
    creditCardNumber: '5472-2601-4438-1041',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '246.88',
    accountNumber: '97939225',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '3492-135720-18801',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '594.71',
    accountNumber: '06595861',
    creditCardIssuer: 'jcb',
    creditCardNumber: '4487859440104',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '351.52',
    accountNumber: '04520144',
    creditCardIssuer: 'discover',
    creditCardNumber: '3728-206135-96650',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '103.94',
    accountNumber: '29199041',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '2377-0225-5873-7784',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '637.36',
    accountNumber: '58642604',
    creditCardIssuer: 'american_express',
    creditCardNumber: '4618-8991-5698-4289',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '749.76',
    accountNumber: '51642726',
    creditCardIssuer: 'diners_club',
    creditCardNumber: '3429-728701-07023',
    currencySymbol: '$',
    paid: 'Paid'
  },
  {
    amount: '691.44',
    accountNumber: '31519238',
    creditCardIssuer: 'mastercard',
    creditCardNumber: '5559-2829-2717-1981',
    currencySymbol: '$',
    paid: 'Unpaid'
  },
  {
    amount: '505.41',
    accountNumber: '31690935',
    creditCardIssuer: 'visa',
    creditCardNumber: '3670-354364-4964',
    currencySymbol: '$',
    paid: 'Paid'
  }
]

const words = [
  'capacitor',
  'system',
  'bus',
  'port',
  'driver',
  'alarm',
  'panel',
  'protocol'
]

function App() {
  const {
    Document,
    Page,
    PageHeader,
    create,
    Viewer,
    PreviewImage,
    isCreating,
    progress
  } = useDocument({
    debug: 'verbose'
  })

  const onClick = async () => {
    const { download } = await create()
    download()
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Box className="absolute " top={25} right={25} zIndex={99}>
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
        <Document>
          <Page
            margin="Thin"
            style={{
              background: `radial-gradient(circle,rgba(238, 174, 202, 1) 0%, rgba(161, 193, 230, 1) 100%), url(${texture})`,
              backgroundBlendMode: 'hard-light'
            }}
          >
            <PageHeader className="flex justify-end">
              <img
                src={logo}
                data-ocr="Logoipsum"
                data-ocr-y="40"
                loading="lazy"
                className="w-[400px] mb-6 mt-2 z-10"
                style={{
                  color: 'rgb(39, 56, 65, 0.8)'
                }}
              />
            </PageHeader>
            <img
              data-ocr={false}
              src={wiggle}
              className="absolute -top-56 -left-36 z-0 opacity-65"
            />
            <Box
              className="flex flex-col pt-8 max-h-1.5 text-right"
              color="#273841"
              opacity={0.9}
              fontSize="1rem"
              textTransform="uppercase"
            >
              {words.map((word) => (
                <div
                  style={{
                    filter: 'drop-shadow(rgb(255, 255, 255, 0.5) 0px 0px 5px)'
                  }}
                  key={faker.string.nanoid()}
                  suppressHydrationWarning={true}
                  className="pt-2 z-10"
                >
                  {word}
                </div>
              ))}
              <Separator
                className="flex self-end my-8 "
                style={{
                  backgroundColor: 'rgba(39, 56, 65, 0.9)',
                  width: 400
                }}
              />
              <div
                style={{
                  filter: 'drop-shadow(rgb(255, 255, 255, 0.4) 0px 0px 5px)'
                }}
                className="text-4xl"
              >
                {((year) => `${year - 1}—${year}`)(
                  faker.date.recent().getFullYear()
                )}
              </div>
            </Box>
          </Page>
          <Page autoPaginate margin="Standard">
            <PageHeader as={Header}>
              <img
                data-ocr="Logoipsum"
                data-ocr-x="75"
                data-ocr-y="0"
                src={logoSimple}
                loading="lazy"
                className="w-[300px] mb-6"
              />
            </PageHeader>
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
                {data.map(
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
          </Page>
        </Document>
      </div>
    </ThemeProvider>
  )
}

export default App
