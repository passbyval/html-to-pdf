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
import { times } from '@/lib/utils'
import { faker } from '@faker-js/faker'
import { type ComponentProps, type PropsWithChildren } from 'react'
import { Button } from './components/ui/button'
import { Box } from './lib/Box'
import { useDocument } from './lib/useDocument'

interface ITableData {
  accountNumber: string
  amount: string
  creditCardIssuer: string
  creditCardNumber: string
  currencySymbol: string
  paid: string
}

const companyName = faker.company.name()

const {
  accountNumber,
  amount,
  creditCardIssuer,
  creditCardNumber,
  currencySymbol
} = faker.finance

const data = times<ITableData>(25, () => {
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

function App() {
  const { Document, create, Viewer, PreviewImage, download, isCreating } =
    useDocument()

  const onClick = async () => {
    await create()
    // download()
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
          Get
        </Button>
      </Box>
      <div className="flex justify-center items-center h-screen w-screen gap-1">
        {/* <Viewer /> */}
        {/* <PreviewImage /> */}
        <Document>
          <Header>
            <img
              data-ocr="false"
              src={logo}
              loading="lazy"
              style={{ width: '70px', paddingRight: '15px' }}
            />
            <h1
              suppressHydrationWarning
              className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance"
            >
              {companyName}
            </h1>
          </Header>
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
        </Document>
      </div>
    </ThemeProvider>
  )
}

export default App
